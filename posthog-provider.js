'use client';

// PostHog client initialization + provider.
// Initializes once on the client, then tracks pageviews on route changes.
// Env vars are wired in Vercel (NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, NEXT_PUBLIC_POSTHOG_HOST).
// If the token is missing (e.g. local dev without .env.local), this silently no-ops.

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

if (typeof window !== 'undefined') {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  if (token && !posthog.__loaded) {
    posthog.init(token, {
      api_host: host,
      // Manual pageview capture below, since Next.js App Router needs it
      capture_pageview: false,
      // Autocapture + heatmaps are on by default per PostHog project settings.
      // Session replay must be enabled here too:
      session_recording: { recordCrossOriginIframes: false },
      disable_session_recording: false,
    });
  }
}

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!pathname) return;
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token) return;
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url = url + '?' + qs;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);
  return null;
}

export function PostHogProvider({ children }) {
  return (
    <PHProvider client={posthog}>
      <PageViewTracker />
      {children}
    </PHProvider>
  );
}
