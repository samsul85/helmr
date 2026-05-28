'use client';

// PostHog client initialization + provider.
// Initializes once on the client, then tracks pageviews on route changes.
// Env vars are wired in Vercel (NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, NEXT_PUBLIC_POSTHOG_HOST).
// If the token is missing (e.g. local dev without .env.local), this silently no-ops.
//
// INTERNAL / TEST USER FILTERING:
// Visiting any page with ?internal=1 once on a given browser sets a permanent
// localStorage flag. From then on, every event from that browser is tagged with
// person property `internal: true`, and session recording is turned off. In
// PostHog, add a global filter "internal is not set to true" (Settings →
// Project → Filter out internal and test users, or per-insight) to exclude all
// your own testing across laptop, phone, incognito, cellular — anywhere you've
// set the flag. To clear the flag on a device, visit with ?internal=0.

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

const INTERNAL_FLAG_KEY = 'helmr.internalTester';

function readInternalFlag() {
  if (typeof window === 'undefined') return false;
  try {
    // URL param can set or clear the flag
    const params = new URLSearchParams(window.location.search);
    if (params.get('internal') === '1') {
      window.localStorage.setItem(INTERNAL_FLAG_KEY, 'true');
    } else if (params.get('internal') === '0') {
      window.localStorage.removeItem(INTERNAL_FLAG_KEY);
    }
    return window.localStorage.getItem(INTERNAL_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined') {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  if (token && !posthog.__loaded) {
    const isInternal = readInternalFlag();
    posthog.init(token, {
      api_host: host,
      // Manual pageview capture below, since Next.js App Router needs it
      capture_pageview: false,
      // Autocapture + heatmaps are on by default per PostHog project settings.
      // Don't record sessions for internal testers.
      disable_session_recording: isInternal,
      session_recording: { recordCrossOriginIframes: false },
      loaded: (ph) => {
        if (isInternal) {
          // Tag this browser's user so all events carry internal: true.
          // register() persists the property on every future event.
          ph.register({ internal: true });
          ph.people && ph.people.set && ph.people.set({ internal: true });
        }
      },
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
    // Re-check the flag on each navigation in case it was just set via ?internal=1
    const isInternal = readInternalFlag();
    if (isInternal) {
      posthog.register({ internal: true });
    }
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url = url + '?' + qs;
    posthog.capture('$pageview', { $current_url: url, internal: isInternal });
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
