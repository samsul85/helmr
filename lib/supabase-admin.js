import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vckmiesiybrtgfphprqh.supabase.co';

let supabaseAdmin;

export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}

export async function setUserProStatus(userId, isPro) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await supabase.auth.admin.getUserById(userId);
  if (fetchError) throw fetchError;

  const currentMetadata = existing.user?.user_metadata || {};
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...currentMetadata,
      plan: isPro ? 'pro' : 'free',
      pro: isPro,
    },
  });

  if (error) throw error;
}
