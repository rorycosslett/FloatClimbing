import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.94.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Admin client with service_role key for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Delete storage files before removing the user
    // Avatars: avatars/{userId}/*
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from('avatars')
      .list(userId);

    if (avatarFiles && avatarFiles.length > 0) {
      const avatarPaths = avatarFiles.map((f) => `${userId}/${f.name}`);
      await supabaseAdmin.storage.from('avatars').remove(avatarPaths);
    }

    // Session photos: session-photos/{userId}/{sessionId}/*
    const { data: sessionFolders } = await supabaseAdmin.storage
      .from('session-photos')
      .list(userId);

    if (sessionFolders && sessionFolders.length > 0) {
      const allPhotoPaths: string[] = [];
      for (const folder of sessionFolders) {
        const { data: files } = await supabaseAdmin.storage
          .from('session-photos')
          .list(`${userId}/${folder.name}`);
        if (files && files.length > 0) {
          for (const file of files) {
            allPhotoPaths.push(`${userId}/${folder.name}/${file.name}`);
          }
        }
      }
      if (allPhotoPaths.length > 0) {
        await supabaseAdmin.storage.from('session-photos').remove(allPhotoPaths);
      }
    }

    // Delete the user from auth.users
    // Cascades to: profiles -> sessions, climbs, user_settings, follows, activity_feed_items
    // Also cascades to: user_integrations (references auth.users directly)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Failed to delete user:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('delete-account error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
