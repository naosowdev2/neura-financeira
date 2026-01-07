import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ApplicationServer, importVapidKeys } from "jsr:@negrel/webpush";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

interface Subscription {
  id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidKeysJson = Deno.env.get('VAPID_KEYS_JSON');

    if (!vapidKeysJson) {
      console.error('VAPID_KEYS_JSON not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured. Run generate-vapid-keys first.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Import VAPID keys from JWK format (exported by generateVapidKeys/exportVapidKeys)
    let vapidKeyPair;
    try {
      const exportedKeys = JSON.parse(vapidKeysJson);
      vapidKeyPair = await importVapidKeys(exportedKeys);
      console.log('VAPID keys imported successfully');
    } catch (keyError) {
      console.error('Failed to import VAPID keys:', keyError);
      return new Response(
        JSON.stringify({ error: 'Invalid VAPID keys format. Regenerate keys with generate-vapid-keys.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create application server
    const appServer = await ApplicationServer.new({
      vapidKeys: vapidKeyPair,
      contactInformation: 'mailto:contato@neura.finance'
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { userId, notification, checkAlerts, checkAllUsers } = body;

    // Handle cron job: check all users
    if (checkAllUsers) {
      console.log('Processing push notifications for all subscribed users (cron job)');

      const { data: activeUsers, error: usersError } = await supabase
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth')
        .eq('is_active', true);

      if (usersError) {
        console.error('Error fetching active users:', usersError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch active users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const uniqueUserIds = [...new Set((activeUsers as any[])?.map((u: any) => u.user_id) || [])];
      console.log(`Found ${uniqueUserIds.length} users with active subscriptions`);

      let totalSent = 0;
      let totalAlerts = 0;

      for (const uid of uniqueUserIds) {
        try {
          const userSubs = (activeUsers as any[])?.filter((s: any) => s.user_id === uid) || [];
          const alerts = await checkUserAlerts(supabase, uid);
          
          if (alerts.length === 0) continue;
          totalAlerts += alerts.length;

          for (const alert of alerts) {
            const sent = await sendToSubscriptions(appServer, userSubs, alert, supabase);
            totalSent += sent;
          }
        } catch (userError) {
          console.error(`Error processing user ${uid}:`, userError);
        }
      }

      console.log(`Cron job complete: ${totalAlerts} alerts, ${totalSent} notifications sent`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          usersProcessed: uniqueUserIds.length,
          alertsFound: totalAlerts,
          notificationsSent: totalSent 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check alerts for specific user
    if (checkAlerts && userId) {
      console.log(`Checking alerts for user: ${userId}`);
      
      const alerts = await checkUserAlerts(supabase, userId);
      
      if (alerts.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No alerts to send' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!subscriptions?.length) {
        return new Response(
          JSON.stringify({ success: false, error: 'No active subscriptions' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let totalSent = 0;
      for (const alert of alerts) {
        const sent = await sendToSubscriptions(appServer, subscriptions as any[], alert, supabase);
        totalSent += sent;
      }

      return new Response(
        JSON.stringify({ success: true, alertsFound: alerts.length, sent: totalSent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send specific notification to user
    if (notification && userId) {
      console.log(`Sending notification to user: ${userId}`);
      
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No active subscriptions found for user');
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'No active subscriptions',
          sent: 0 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Found ${subscriptions.length} active subscription(s)`);

      const payload: PushPayload = {
        title: notification.title || 'Neura',
        body: notification.body || '',
        icon: notification.icon || '/pwa/icon-192x192.png',
        badge: notification.badge || '/pwa/badge-icon.png',
        url: notification.url || '/',
        tag: notification.tag,
      };

      const sent = await sendToSubscriptions(appServer, subscriptions as any[], payload, supabase);

      return new Response(JSON.stringify({ 
        success: sent > 0, 
        sent,
        total: subscriptions.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in push-notifications:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendToSubscriptions(
  appServer: ApplicationServer,
  subscriptions: Subscription[],
  payload: PushPayload,
  supabase: any
): Promise<number> {
  let successCount = 0;

  for (const sub of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      console.log(`Sending push to: ${sub.endpoint.substring(0, 50)}...`);

      // Create subscriber and send encrypted push
      const subscriber = appServer.subscribe(pushSubscription);
      
      try {
        await subscriber.pushTextMessage(JSON.stringify(payload), { ttl: 86400 });
        successCount++;
        console.log('Push sent successfully!');
      } catch (pushError: any) {
        console.error(`Push failed:`, pushError);
        
        // Check if subscription is gone (expired/invalid)
        if (pushError.isGone?.() || pushError.response?.status === 410 || pushError.response?.status === 404) {
          console.log(`Subscription expired/invalid, marking as inactive: ${sub.id}`);
          if (sub.id) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }
        }
      }
    } catch (error) {
      console.error(`Error sending to subscription ${sub.id}:`, error);
    }
  }

  console.log(`Sent ${successCount} of ${subscriptions.length} notifications`);
  return successCount;
}

async function checkUserAlerts(
  supabase: any,
  userId: string
): Promise<PushPayload[]> {
  const alerts: PushPayload[] = [];
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check budgets
    const { data: budgets } = await supabase
      .from('budgets')
      .select(`
        id, amount, period, category_id,
        categories!budgets_category_id_fkey (name)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (budgets) {
      for (const budget of budgets as any[]) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', userId)
          .eq('category_id', budget.category_id)
          .eq('type', 'expense')
          .eq('status', 'confirmed')
          .gte('date', startOfMonth.toISOString().split('T')[0]);

        if (transactions) {
          const spent = (transactions as any[]).reduce((sum: number, t: any) => sum + Number(t.amount), 0);
          const percentage = (spent / budget.amount) * 100;
          const categoryName = budget.categories?.name || 'Categoria';

          if (percentage >= 100) {
            alerts.push({
              title: '🚨 Orçamento Ultrapassado!',
              body: `${categoryName}: R$ ${spent.toFixed(2)} de R$ ${budget.amount.toFixed(2)}`,
              tag: `budget-exceeded-${budget.id}`,
              url: '/planning',
              icon: '/pwa/icon-192x192.png',
              requireInteraction: true,
            });
          } else if (percentage >= 80) {
            alerts.push({
              title: '⚠️ Orçamento Quase no Limite',
              body: `${categoryName}: ${percentage.toFixed(0)}% usado`,
              tag: `budget-warning-${budget.id}`,
              url: '/planning',
              icon: '/pwa/icon-192x192.png',
            });
          }
        }
      }
    }

    // Check invoices due soon
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: invoices } = await supabase
      .from('credit_card_invoices')
      .select(`
        id, due_date, total_amount, status,
        credit_cards!credit_card_invoices_credit_card_id_fkey (name)
      `)
      .eq('user_id', userId)
      .eq('status', 'open')
      .lte('due_date', tomorrow.toISOString().split('T')[0])
      .gte('due_date', today);

    if (invoices) {
      for (const invoice of invoices as any[]) {
        const cardName = invoice.credit_cards?.name || 'Cartão';
        const isToday = invoice.due_date === today;

        alerts.push({
          title: isToday ? '🔴 Fatura Vence Hoje!' : '🟡 Fatura Vence Amanhã',
          body: `${cardName}: R$ ${Number(invoice.total_amount).toFixed(2)}`,
          tag: `invoice-due-${invoice.id}`,
          url: '/dashboard',
          icon: '/pwa/icon-192x192.png',
          requireInteraction: isToday,
        });
      }
    }

    // Check low account balances
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, current_balance')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .eq('include_in_total', true)
      .lt('current_balance', 100)
      .gte('current_balance', 0);

    if (accounts) {
      for (const account of accounts as any[]) {
        alerts.push({
          title: '💰 Saldo Baixo',
          body: `${account.name}: R$ ${Number(account.current_balance).toFixed(2)}`,
          tag: `low-balance-${account.id}`,
          url: '/accounts',
          icon: '/pwa/icon-192x192.png',
        });
      }
    }

  } catch (error) {
    console.error('Error checking user alerts:', error);
  }

  return alerts;
}
