import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // First try the base64url public key (preferred for frontend)
    let publicKey = Deno.env.get('VAPID_PUBLIC_KEY_B64');
    
    // If not set, try to extract from VAPID_KEYS_JSON
    if (!publicKey) {
      const vapidKeysJson = Deno.env.get('VAPID_KEYS_JSON');
      
      if (vapidKeysJson) {
        try {
          const exportedKeys = JSON.parse(vapidKeysJson);
          // Extract x and y from JWK format and convert to uncompressed point
          if (exportedKeys.publicKey?.x && exportedKeys.publicKey?.y) {
            const x = Uint8Array.from(
              atob(exportedKeys.publicKey.x.replace(/-/g, '+').replace(/_/g, '/')),
              c => c.charCodeAt(0)
            );
            const y = Uint8Array.from(
              atob(exportedKeys.publicKey.y.replace(/-/g, '+').replace(/_/g, '/')),
              c => c.charCodeAt(0)
            );
            
            // Uncompressed point format: 0x04 + x + y
            const publicKeyRaw = new Uint8Array(65);
            publicKeyRaw[0] = 0x04;
            publicKeyRaw.set(x, 1);
            publicKeyRaw.set(y, 33);
            
            // Convert to base64url
            publicKey = btoa(String.fromCharCode(...publicKeyRaw))
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');
              
            console.log('Extracted public key from VAPID_KEYS_JSON');
          }
        } catch (e) {
          console.error('Failed to parse VAPID_KEYS_JSON:', e);
        }
      }
    }

    if (!publicKey) {
      console.error('No VAPID public key available');
      return new Response(
        JSON.stringify({ error: 'VAPID public key not configured. Run generate-vapid-keys first.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ publicKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
