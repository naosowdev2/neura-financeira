export const APP_VERSION = "1.0.0";
export const APP_NAME = "Neura Finance";
export const BUILD_DATE = new Date().toISOString().split('T')[0];

/**
 * ===== PADRÃO DE LOGOS E ÍCONES =====
 * 
 * Arquivos disponíveis em src/assets:
 * 
 * 1. neura-icon.png
 *    - Ícone do robô com headphones (formato quadrado)
 *    - Usar em: headers, avatars, ícones pequenos, navegação
 *    - Importar: import neuraIcon from "@/assets/neura-icon.png"
 * 
 * 2. neura-logo.png
 *    - Logo completa horizontal com robô + texto "NeurIA Financeira"
 *    - Usar em: páginas de boas-vindas, instalação, splash screens
 *    - Importar: import neuraLogo from "@/assets/neura-logo.png"
 * 
 * REGRAS:
 * - Headers (AppHeader, MobileNav): usar neura-icon.png
 * - Páginas de entrada (Auth, Install, Index): usar neura-icon.png ou neura-logo.png conforme layout
 * - Animações (LoginTransition): usar neura-icon.png
 * - Assistente AI: usar neura-icon.png
 * 
 * NÃO USAR: logo.png (obsoleto)
 */

/**
 * ===== NOTIFICAÇÕES PUSH =====
 * 
 * Arquitetura:
 * - Service Worker customizado em src/sw.ts usando injectManifest
 * - Handlers de push/notificationclick inclusos no SW
 * - VAPID keys configuradas nos secrets do Supabase
 * 
 * Limitações conhecidas:
 * - No preview do Lovable (iframe), notificações podem aparecer como "Bloqueado"
 * - Solução: abrir o app em nova aba ou instalar como PWA
 * 
 * Checklist de debug:
 * 1. Verificar Notification.permission === 'granted'
 * 2. Verificar navigator.serviceWorker.controller existe
 * 3. Verificar subscription no PushManager do navegador
 * 4. Verificar subscription ativa no banco (push_subscriptions)
 * 5. Verificar logs do edge function push-notifications
 * 
 * Para testar:
 * - Botão "Teste local": testa apenas SW/showNotification
 * - Botão "Teste push": testa fluxo completo (edge function -> push provider -> SW)
 */
