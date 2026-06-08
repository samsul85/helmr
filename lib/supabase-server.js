import { createServerClient } from '@supabase/ssr';

const supabaseUrl = 'https://vckmiesiybrtgfphprqh.supabase.co';
const supabaseAnonKey = 'sb_publishable_YGNRlZ9G2KYLy6E6IpVG1A_hMQ8_G31';

export async function getSupabaseUserFromRequest(request) {
  const cookiesToSet = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(nextCookies) {
        cookiesToSet.push(...nextCookies);
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  return {
    user: data?.user || null,
    error,
    cookiesToSet,
  };
}

export function applySupabaseCookies(response, cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}
