import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// OTP sign-in completes in-app; legacy magic links may still land on /app.
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
