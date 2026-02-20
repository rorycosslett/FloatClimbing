import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.94.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  type: 'follow' | 'like' | 'comment';
  target_user_id: string;
  actor_user_id: string;
  actor_name: string;
  feed_item_id?: string;
  comment_preview?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client to bypass RLS for reading notification tokens
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const payload: NotificationPayload = await req.json();
    const { type, target_user_id, actor_name, feed_item_id, comment_preview } = payload;

    // Fetch all push tokens for the target user
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('notification_tokens')
      .select('expo_push_token')
      .eq('user_id', target_user_id);

    if (tokensError || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build notification content based on type
    let title: string;
    let body: string;
    const data: Record<string, string> = { type };

    switch (type) {
      case 'follow':
        title = 'New Follower';
        body = `${actor_name} started following you`;
        break;
      case 'like':
        title = 'New Like';
        body = `${actor_name} liked your session`;
        if (feed_item_id) data.feed_item_id = feed_item_id;
        break;
      case 'comment':
        title = 'New Comment';
        body = comment_preview
          ? `${actor_name}: "${comment_preview}"`
          : `${actor_name} commented on your session`;
        if (feed_item_id) data.feed_item_id = feed_item_id;
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unknown notification type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Build Expo push messages
    const messages = tokens.map((t: { expo_push_token: string }) => ({
      to: t.expo_push_token,
      sound: 'default' as const,
      title,
      body,
      data,
    }));

    // Send via Expo Push API
    const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoPushResult = await expoPushResponse.json();

    // Clean up invalid tokens
    if (expoPushResult.data) {
      const invalidTokens: string[] = [];
      expoPushResult.data.forEach(
        (result: { status: string; details?: { error?: string } }, index: number) => {
          if (
            result.status === 'error' &&
            result.details?.error === 'DeviceNotRegistered'
          ) {
            invalidTokens.push(tokens[index].expo_push_token);
          }
        }
      );

      if (invalidTokens.length > 0) {
        await supabaseAdmin
          .from('notification_tokens')
          .delete()
          .in('expo_push_token', invalidTokens);
      }
    }

    return new Response(JSON.stringify({ sent: messages.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-notification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
