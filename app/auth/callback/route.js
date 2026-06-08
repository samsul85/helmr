import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const supabaseUrl = 'https://vckmiesiybrtgfphprqh.supabase.co';
const supabaseAnonKey = 'sb_publishable_YGNRlZ9G2KYLy6E6IpVG1A_hMQ8_G31';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectUrl = new URL('/app', requestUrl.origin);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  if (!code) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            path: options?.path || '/',
            sameSite: options?.sameSite || 'lax',
            secure: requestUrl.protocol === 'https:',
          });
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Supabase auth code exchange failed:', error.message);
  }

  return response;
}
