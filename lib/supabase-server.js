import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getAccessTokenFromRequest(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.includes('auth-token')) continue;
    try {
      const parsed = JSON.parse(cookie.value);
      if (parsed?.access_token) return parsed.access_token;
    } catch {
      // ignore malformed cookie chunks
    }
  }

  return null;
}

export async function getSupabaseUserFromRequest(request) {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return { user: null, error: null, cookiesToSet: [] };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);

  return {
    user: data?.user || null,
    error,
    cookiesToSet: [],
  };
}

export function applySupabaseCookies(response, cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}
