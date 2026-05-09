// supabase/functions/send-push/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as webpush from "npm:web-push@3.6.7"

const VAPID_PUBLIC_KEY = "BKJccS-o4FBHCZdizTp7pLx7bje1ATyH8HEmOz6IADkQwzOgVsp41m3AEjmoJSeW8zgFrvrFJkitNKyA5m_F0mc";
const VAPID_PRIVATE_KEY = "sGjOMcwQkXOokXIfMOdT7NFDldAch9GQnnt5DOQiXnU";
const VAPID_EMAIL = "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

serve(async (req) => {
  try {
    const { record } = await req.json();
    
    // Create Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user's push subscriptions
    const { data: subscriptions, error } = await supabaseClient
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', record.user_id);

    if (error) throw error;

    const pushPromises = subscriptions.map((sub: any) => {
      const payload = JSON.stringify({
        title: record.title,
        body: record.body,
        data: record.data || {}
      });

      return webpush.sendNotification(sub.subscription, payload)
        .catch((err: any) => {
          console.error('Push error:', err);
          if (err.statusCode === 404 || err.statusCode === 410) {
            // Subscription expired, should delete it
          }
        });
    });

    await Promise.all(pushPromises);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
})
