'use client';

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://vckmiesiybrtgfphprqh.supabase.co',
  'sb_publishable_YGNRlZ9G2KYLy6E6IpVG1A_hMQ8_G31',
);

export const AUTH_REDIRECT_PATH = '/app';

export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}
