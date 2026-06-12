import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = 'https://vckmiesiybrtgfphprqh.supabase.co';
const supabaseAnonKey = 'sb_publishable_YGNRlZ9G2KYLy6E6IpVG1A_hMQ8_G31';

// Magic links redirect here (not /auth/callback) for iOS Safari/PWA compatibility.
export const AUTH_REDIRECT_PATH = '/app';

// Supabase dashboard → Authentication → URL configuration:
// Site URL: https://helmr-git-v2-samsul85s-projects.vercel.app
// Redirect URLs: https://helmr-git-v2-samsul85s-projects.vercel.app/app

let supabaseClient;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
}
