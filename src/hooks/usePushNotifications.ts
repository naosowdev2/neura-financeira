import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushDiagnostics {
  isInIframe: boolean;
  browserPermission: NotificationPermission;
  hasServiceWorker: boolean;
  swControlling: boolean;
  hasBrowserSubscription: boolean;
  hasDbSubscription: boolean;
  vapidKeyLoaded: boolean;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasBrowserSubscription, setHasBrowserSubscription] = useState(false);
  const [hasDbSubscription, setHasDbSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [vapidKey, setVapidKey] = useState<string>('');
  const [diagnostics, setDiagnostics] = useState<PushDiagnostics | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    'Notification' in window && 
    'serviceWorker' in navigator && 
    'PushManager' in window;

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Fetch VAPID public key
  useEffect(() => {
    async function fetchVapidKey() {
      if (vapidKey) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('get-vapid-key');
        if (!error && data?.publicKey) {
          setVapidKey(data.publicKey);
        }
      } catch (e) {
        console.log('Could not fetch VAPID key:', e);
      }
    }
    
    fetchVapidKey();
  }, [vapidKey]);

  // Initialize service worker and check subscription
  useEffect(() => {
    if (!isSupported) return;
    
    setPermission(Notification.permission);
    
    async function initServiceWorker() {
      try {
        // Try to get existing registration first
        let reg = await navigator.serviceWorker.getRegistration();
        
        if (!reg) {
          // Wait for ready
          reg = await navigator.serviceWorker.ready;
        }
        
        if (reg) {
          setRegistration(reg);
          const subscription = await reg.pushManager.getSubscription();
          setHasBrowserSubscription(!!subscription);
          console.log('[Push] Browser subscription:', !!subscription);
        }
      } catch (e) {
        console.error('[Push] SW init error:', e);
      }
    }
    
    initServiceWorker();
  }, [isSupported]);

  // Check database for subscription status
  useEffect(() => {
    if (!user || !isSupported) return;
    
    async function checkDbSubscription() {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .limit(1);
      
      const hasDb = !!(data && data.length > 0);
      setHasDbSubscription(hasDb);
      console.log('[Push] DB subscription:', hasDb);
    }
    
    checkDbSubscription();
  }, [user, isSupported]);

  // Update combined isSubscribed state
  useEffect(() => {
    const subscribed = hasBrowserSubscription && hasDbSubscription && permission === 'granted';
    setIsSubscribed(subscribed);
  }, [hasBrowserSubscription, hasDbSubscription, permission]);

  // Update diagnostics
  useEffect(() => {
    setDiagnostics({
      isInIframe,
      browserPermission: permission,
      hasServiceWorker: !!registration,
      swControlling: !!navigator.serviceWorker?.controller,
      hasBrowserSubscription,
      hasDbSubscription,
      vapidKeyLoaded: !!vapidKey,
    });
  }, [isInIframe, permission, registration, hasBrowserSubscription, hasDbSubscription, vapidKey]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      showToast.error('Notificações não suportadas neste navegador');
      return 'denied';
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      showToast.error('Não foi possível ativar notificações');
      return false;
    }
    
    if (!vapidKey) {
      showToast.error('Chave VAPID não configurada');
      return false;
    }

    // Check for iframe
    if (isInIframe) {
      showToast.warning('Abra o app em uma nova aba para ativar notificações');
      return false;
    }
    
    setIsLoading(true);
    try {
      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const result = await requestPermission();
        if (result !== 'granted') {
          showToast.warning('Permissão para notificações negada');
          return false;
        }
      }

      // Get or wait for registration
      let reg = registration;
      if (!reg) {
        reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          reg = await navigator.serviceWorker.ready;
        }
        setRegistration(reg);
      }

      if (!reg) {
        showToast.error('Service Worker não encontrado. Tente recarregar a página.');
        return false;
      }

      // Create push subscription
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Extract keys from subscription
      const subscriptionJson = subscription.toJSON();
      const p256dh = subscriptionJson.keys?.p256dh;
      const auth = subscriptionJson.keys?.auth;

      if (!p256dh || !auth) {
        throw new Error('Falha ao obter chaves da subscription');
      }

      // Save subscription to database
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('endpoint', subscription.endpoint)
        .limit(1);

      if (existing && existing.length > 0) {
        const { error: updateError } = await (supabase
          .from('push_subscriptions') as any)
          .update({
            p256dh: p256dh,
            auth: auth,
            user_agent: navigator.userAgent,
            is_active: true,
          })
          .eq('endpoint', subscription.endpoint);
        if (updateError) {
          console.error('Error updating subscription:', updateError);
          throw new Error('Falha ao atualizar subscription');
        }
      } else {
        const { error: insertError } = await (supabase
          .from('push_subscriptions') as any)
          .insert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh: p256dh,
            auth: auth,
            user_agent: navigator.userAgent,
            is_active: true,
          });
        if (insertError) {
          console.error('Error inserting subscription:', insertError);
          throw new Error('Falha ao salvar subscription');
        }
      }

      setHasBrowserSubscription(true);
      setHasDbSubscription(true);
      showToast.success('Notificações ativadas com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao ativar notificações:', error);
      showToast.error('Erro ao ativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, registration, requestPermission, vapidKey, isInIframe]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false;
    
    setIsLoading(true);
    try {
      const reg = registration || await navigator.serviceWorker.getRegistration();
      
      if (reg) {
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint)
            .eq('user_id', user.id);
        }
      }

      setHasBrowserSubscription(false);
      setHasDbSubscription(false);
      showToast.info('Notificações desativadas');
      return true;
    } catch (error) {
      console.error('Erro ao desativar notificações:', error);
      showToast.error('Erro ao desativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, registration]);

  const sendTestNotification = useCallback(async (type: 'local' | 'push' = 'push'): Promise<{ success: boolean; message: string }> => {
    if (!isSupported) {
      return { success: false, message: 'Navegador não suporta notificações' };
    }
    
    const reg = registration || await navigator.serviceWorker.getRegistration();
    
    if (type === 'local') {
      // Local notification - tests SW showNotification
      if (reg) {
        await reg.showNotification('🎉 Teste Local', {
          body: 'O Service Worker está funcionando corretamente!',
          icon: '/pwa/icon-192x192.png',
          badge: '/pwa/icon-72x72.png',
          tag: 'test-local',
        });
        showToast.success('Notificação local enviada!');
        return { success: true, message: 'Notificação local enviada!' };
      } else {
        showToast.error('Service Worker não encontrado');
        return { success: false, message: 'Service Worker não encontrado' };
      }
    }
    
    // Push notification - tests full flow with encryption
    if (!user) {
      showToast.error('Faça login para testar');
      return { success: false, message: 'Usuário não autenticado' };
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          userId: user.id,
          notification: {
            title: '🎉 Teste de Push',
            body: 'A notificação push chegou corretamente!',
            tag: 'test-push',
            url: '/settings',
          },
        },
      });

      if (error) {
        console.error('Push test error:', error);
        showToast.error(`Erro: ${error.message}`);
        return { success: false, message: error.message };
      }
      
      console.log('Push test response:', data);
      
      if (data?.success && data?.sent > 0) {
        showToast.success(`Push enviado para ${data.sent} dispositivo(s)!`);
        return { success: true, message: `Enviado para ${data.sent} dispositivo(s)` };
      } else if (data?.sent === 0) {
        showToast.warning('Nenhuma subscription ativa encontrada');
        return { success: false, message: 'Nenhuma subscription ativa' };
      } else {
        showToast.warning(data?.error || 'Falha ao enviar push');
        return { success: false, message: data?.error || 'Falha ao enviar' };
      }
    } catch (err) {
      console.error('Push test exception:', err);
      showToast.error('Erro ao enviar push');
      return { success: false, message: 'Erro de conexão' };
    }
  }, [isSupported, user, registration]);

  return {
    isSupported,
    permission,
    isSubscribed,
    hasBrowserSubscription,
    hasDbSubscription,
    isLoading,
    isInIframe,
    diagnostics,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
