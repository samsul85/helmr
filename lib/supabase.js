import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = 'https://vckmiesiybrtgfphprqh.supabase.co';
const supabaseAnonKey = 'sb_publishable_YGNRlZ9G2KYLy6E6IpVG1A_hMQ8_G31';

let supabaseClient;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
}
