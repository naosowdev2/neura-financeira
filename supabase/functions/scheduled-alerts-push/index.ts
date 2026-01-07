import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Alert {
  id: string;
  type: 'budget' | 'balance' | 'pattern' | 'insight' | 'invoice' | 'savings';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting scheduled alerts push check...');

    // Get all users with active push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .eq('is_active', true);

    if (subsError) throw subsError;

    const uniqueUserIds = [...new Set((subscriptions || []).map((s: any) => s.user_id))];
    console.log(`Found ${uniqueUserIds.length} users with active subscriptions`);

    let totalAlertsSent = 0;
    let usersProcessed = 0;

    for (const userId of uniqueUserIds) {
      try {
        // Call ai-alerts-monitor to get current alerts for user
        const alertsResponse = await fetch(`${supabaseUrl}/functions/v1/ai-alerts-monitor`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        if (!alertsResponse.ok) {
          console.error(`Failed to get alerts for user ${userId}`);
          continue;
        }

        const alertsData = await alertsResponse.json();
        const alerts: Alert[] = alertsData.alerts || [];

        // Filter only critical and warning alerts
        const importantAlerts = alerts.filter(
          a => a.severity === 'critical' || a.severity === 'warning'
        );

        if (importantAlerts.length === 0) {
          continue;
        }

        // Check which alerts haven't been sent recently (within 4 hours)
        const fourHoursAgo = new Date();
        fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

        const { data: recentLogs } = await supabase
          .from('push_notification_logs')
          .select('alert_id')
          .eq('user_id', userId)
          .gte('sent_at', fourHoursAgo.toISOString());

        const recentAlertIds = new Set((recentLogs || []).map((l: any) => l.alert_id));

        // Filter out already sent alerts
        const newAlerts = importantAlerts.filter(a => !recentAlertIds.has(a.id));

        if (newAlerts.length === 0) {
          continue;
        }

        // Send push notifications for new alerts
        for (const alert of newAlerts) {
          try {
            const pushResponse = await fetch(`${supabaseUrl}/functions/v1/push-notifications`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId,
                notification: {
                  title: alert.title,
                  body: alert.message,
                  tag: `alert-${alert.type}-${alert.id}`,
                  url: getAlertUrl(alert.type),
                  requireInteraction: alert.severity === 'critical',
                },
              }),
            });

            if (pushResponse.ok) {
              // Log the sent notification
              await supabase
                .from('push_notification_logs')
                .upsert({
                  user_id: userId,
                  alert_type: alert.type,
                  alert_id: alert.id,
                  sent_at: new Date().toISOString(),
                }, {
                  onConflict: 'user_id,alert_id',
                });

              totalAlertsSent++;
            }
          } catch (pushError) {
            console.error(`Failed to send push for alert ${alert.id}:`, pushError);
          }
        }

        usersProcessed++;
      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
      }
    }

    // Clean up old logs (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabase
      .from('push_notification_logs')
      .delete()
      .lt('sent_at', sevenDaysAgo.toISOString());

    console.log(`Scheduled alerts push complete: ${totalAlertsSent} alerts sent to ${usersProcessed} users`);

    return new Response(
      JSON.stringify({
        success: true,
        usersChecked: uniqueUserIds.length,
        usersWithAlerts: usersProcessed,
        alertsSent: totalAlertsSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scheduled-alerts-push:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getAlertUrl(alertType: string): string {
  switch (alertType) {
    case 'budget':
      return '/planning';
    case 'invoice':
      return '/dashboard';
    case 'balance':
      return '/accounts';
    case 'savings':
      return '/planning';
    default:
      return '/dashboard';
  }
}
