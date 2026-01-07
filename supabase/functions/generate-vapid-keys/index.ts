import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  generateVapidKeys, 
  exportVapidKeys,
  exportApplicationServerKey 
} from "jsr:@negrel/webpush";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating VAPID keys using @negrel/webpush...');
    
    // Generate keys using the library's native function
    const vapidKeys = await generateVapidKeys({ extractable: true });
    
    // Export to JWK format (compatible with importVapidKeys)
    const vapidKeysJson = await exportVapidKeys(vapidKeys);
    
    // Get public key in base64url format for frontend
    const publicKeyBase64Url = await exportApplicationServerKey(vapidKeys);

    console.log('VAPID keys generated successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        instructions: 'Salve esses valores nos Supabase Secrets',
        secrets: {
          VAPID_KEYS_JSON: JSON.stringify(vapidKeysJson),
          VAPID_PUBLIC_KEY_B64: publicKeyBase64Url,
        },
        note: 'VAPID_KEYS_JSON contém ambas as chaves no formato JWK compatível com importVapidKeys. VAPID_PUBLIC_KEY_B64 é a chave pública em base64url para o frontend.'
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating VAPID keys:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
