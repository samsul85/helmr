'use client';

// Public landing page at helmr.ca/
// Goal: tell strangers what Helmr is in 5 seconds, capture their email if they're
// not ready to try, send them to the app if they are.
// Existing users go to helmr.ca/app directly (their old links still work via the
// same path structure).
//
// Headline copy is intentionally generic — the real positioning waits until
// after the Tricia call confirms (or reframes) the niche.

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
const WAITLIST_URL = 'https://forms.gle/N1Hj3eh2VGiTApVi7';

const S = {
  page: {
    minHeight: '100vh',
    background: '#f5f3ee',
    color: '#1a1a1a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '960px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  brand: {
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  navLink: {
    fontSize: '14px',
    color: '#666',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  hero: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '40px 24px 60px',
    maxWidth: '760px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  eyebrow: {
    fontSize: '13px',
    color: '#085041',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: '24px',
  },
  headline: {
    fontSize: 'clamp(32px, 5vw, 48px)',
    fontWeight: 500,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    margin: '0 0 20px',
    maxWidth: '680px',
  },
  subhead: {
    fontSize: 'clamp(16px, 2vw, 19px)',
    color: '#555',
    lineHeight: 1.5,
    margin: '0 0 36px',
    maxWidth: '560px',
  },
  ctaRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '40px',
  },
  btnPrimary: {
    background: '#1a1a1a',
    color: 'white',
    padding: '14px 24px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'none',
    display: 'inline-block',
  },
  btnSecondary: {
    background: 'transparent',
    color: '#1a1a1a',
    padding: '14px 24px',
    borderRadius: '10px',
    border: '0.5px solid #1a1a1a',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'none',
    display: 'inline-block',
  },
  context: {
    fontSize: '13px',
    color: '#888',
    margin: '0',
  },
  features: {
    background: 'white',
    padding: '60px 24px',
    borderTop: '0.5px solid #e5e0d4',
  },
  featuresInner: {
    maxWidth: '900px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '32px',
  },
  feature: {
    textAlign: 'left',
  },
  featureIcon: {
    fontSize: '24px',
    marginBottom: '12px',
  },
  featureTitle: {
    fontSize: '16px',
    fontWeight: 500,
    margin: '0 0 6px',
    color: '#1a1a1a',
  },
  featureDesc: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.5,
    margin: 0,
  },
  footer: {
    padding: '32px 24px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#999',
    borderTop: '0.5px solid #e5e0d4',
  },
  footerLink: {
    color: '#666',
    textDecoration: 'none',
    margin: '0 8px',
  },
};

export default function LandingPage() {
  useEffect(() => {
    // Track landing-page view explicitly so we can see it in PostHog separately
    // from in-app navigation. (The provider also fires $pageview automatically.)
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('landing_page_viewed');
    }
  }, []);

  const onTryClick = () => {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('landing_cta_clicked', { cta: 'try_prototype' });
    }
  };
  const onWaitlistClick = () => {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('landing_cta_clicked', { cta: 'waitlist' });
    }
  };

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.brand}>⚓ Helmr</div>
        <a href="/app" style={S.navLink} onClick={onTryClick}>Open app →</a>
      </nav>

      <section style={S.hero}>
        <div style={S.eyebrow}>For Canadian groups</div>
        <h1 style={S.headline}>
          Plan group events and coordinate money in one place.
        </h1>
        <p style={S.subhead}>
          Less group-chat chaos, fewer awkward asks. Built around Interac e-Transfer — no card fees, no platform middleman.
        </p>
        <div style={S.ctaRow}>
          <a
            href={WAITLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={S.btnPrimary}
            onClick={onWaitlistClick}
          >
            Get notified
          </a>
          <a
            href="/app"
            style={S.btnSecondary}
            onClick={onTryClick}
          >
            Try the prototype
          </a>
        </div>
        <p style={S.context}>
          Early prototype · Feedback welcome
        </p>
      </section>

      <section style={S.features}>
        <div style={S.featuresInner}>
          <div style={S.feature}>
            <div style={S.featureIcon}>🪴</div>
            <h3 style={S.featureTitle}>Plan and collect together</h3>
            <p style={S.featureDesc}>
              Set up the event, invite people, and collect contributions all in one flow. No spreadsheets, no separate apps.
            </p>
          </div>
          <div style={S.feature}>
            <div style={S.featureIcon}>🇨🇦</div>
            <h3 style={S.featureTitle}>Built for Interac</h3>
            <p style={S.featureDesc}>
              Money moves bank-to-bank between guests and the organizer. No card fees, no funds held by us.
            </p>
          </div>
          <div style={S.feature}>
            <div style={S.featureIcon}>👥</div>
            <h3 style={S.featureTitle}>Open Pool or Split a Cost</h3>
            <p style={S.featureDesc}>
              Run an open pool where people chip in what they want, or split a known cost across a known group.
            </p>
          </div>
        </div>
      </section>

      <footer style={S.footer}>
        <div>
          Made in Canada by Sam ·{' '}
          <a href="mailto:sam@helmr.ca" style={S.footerLink}>sam@helmr.ca</a>
        </div>
        <div style={{ marginTop: '6px', color: '#bbb' }}>
          © {new Date().getFullYear()} Helmr · Early access
        </div>
      </footer>
    </div>
  );
}
