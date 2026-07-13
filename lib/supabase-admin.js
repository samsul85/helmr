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

/**
 * Update Pro plan flags on a Supabase user.
 * Uses updateUserById only — Supabase merges user_metadata, and getUserById
 * has been unreliable with the service-role admin client in this project.
 */
export async function setUserProStatus(userId, isPro, options = {}) {
  if (!userId) {
    throw new Error('Missing userId');
  }

  const supabase = getSupabaseAdmin();
  const user_metadata = {
    plan: isPro ? 'pro' : 'free',
    pro: Boolean(isPro),
  };

  if (options.planInterval != null) {
    user_metadata.plan_interval = options.planInterval;
  }

  if (!isPro) {
    user_metadata.plan_interval = null;
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata,
  });

  if (error) throw error;
}
