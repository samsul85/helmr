import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const redirectPath = next && next.startsWith('/') ? next : '/app';
  const redirectUrl = new URL(redirectPath, requestUrl.origin);

  if (code) {
    redirectUrl.searchParams.set('code', code);
  }

  return NextResponse.redirect(redirectUrl);
}
