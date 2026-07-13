'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const WAITLIST_URL = 'https://forms.gle/N1Hj3eh2VGiTApVi7';

const S = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#f0ede8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
  },
  nav: {
    padding: '20px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1100px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  brand: {
    height: '32px',
    width: 'auto',
    display: 'block',
    filter: 'brightness(0) invert(1)',
  },
  navLink: {
    fontSize: '14px',
    color: '#888',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 24px 60px',
    maxWidth: '820px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  eyebrow: {
    fontSize: '12px',
    color: '#0F6E56',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  eyebrowDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#0F6E56',
    display: 'inline-block',
    flexShrink: 0,
  },
  headline: {
    fontSize: 'clamp(38px, 6vw, 68px)',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.05,
    margin: '0 0 24px',
    maxWidth: '780px',
    color: '#f0ede8',
  },
  headlineAccent: {
    color: '#0F6E56',
  },
  subhead: {
    fontSize: 'clamp(16px, 2vw, 20px)',
    color: '#888',
    lineHeight: 1.6,
    margin: '0 0 40px',
    maxWidth: '520px',
  },
  ctaRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '56px',
  },
  btnPrimary: {
    background: '#0F6E56',
    color: 'white',
    padding: '15px 28px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'none',
    display: 'inline-block',
    letterSpacing: '-0.01em',
  },
  btnSecondary: {
    background: 'transparent',
    color: '#888',
    padding: '15px 28px',
    borderRadius: '10px',
    border: '1px solid #2a2a2a',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'none',
    display: 'inline-block',
  },
  socialProof: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#555',
    fontSize: '13px',
  },
  avatars: {
    display: 'flex',
  },
  videoSection: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto 100px',
    padding: '0 24px',
    boxSizing: 'border-box',
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: '16/9',
    background: '#111',
    borderRadius: '16px',
    border: '1px solid #1e1e1e',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  playButton: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#0F6E56',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  videoLabel: {
    fontSize: '14px',
    color: '#555',
    letterSpacing: '0.02em',
  },
  divider: {
    height: '1px',
    background: '#1a1a1a',
    maxWidth: '1100px',
    margin: '0 auto',
    width: 'calc(100% - 48px)',
  },
  howItWorks: {
    padding: '80px 24px',
    maxWidth: '1100px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  sectionLabel: {
    fontSize: '12px',
    color: '#555',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: '48px',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '2px',
  },
  step: {
    background: '#111',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  stepNumber: {
    fontSize: '12px',
    color: '#0F6E56',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  stepTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#f0ede8',
    letterSpacing: '-0.02em',
    margin: 0,
    lineHeight: 1.2,
  },
  stepDesc: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.6,
    margin: 0,
  },
  features: {
    padding: '80px 24px',
    maxWidth: '1100px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  featureCard: {
    background: '#0f0f0f',
    borderRadius: '12px',
    padding: '28px',
    border: '1px solid #1a1a1a',
  },
  featureIcon: {
    fontSize: '22px',
    marginBottom: '16px',
    display: 'block',
  },
  featureTitle: {
    fontSize: '16px',
    fontWeight: 600,
    margin: '0 0 8px',
    color: '#f0ede8',
    letterSpacing: '-0.01em',
  },
  featureDesc: {
    fontSize: '14px',
    color: '#555',
    lineHeight: 1.6,
    margin: 0,
  },
  pricing: {
    padding: '80px 24px',
    maxWidth: '760px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  pricingHeading: {
    fontSize: 'clamp(28px, 4vw, 40px)',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    textAlign: 'center',
    margin: '0 0 8px',
    color: '#f0ede8',
  },
  pricingSub: {
    textAlign: 'center',
    color: '#555',
    fontSize: '15px',
    margin: '0 0 48px',
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  },
  pricingCard: {
    borderRadius: '16px',
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
  pricingCardFree: {
    background: '#0f0f0f',
    border: '1px solid #1a1a1a',
  },
  pricingCardPro: {
    background: '#0a1f1a',
    border: '1px solid #0F6E56',
  },
  pricingPlan: {
    fontSize: '13px',
    fontWeight: 600,
    margin: '0 0 16px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  pricingPrice: {
    fontSize: '40px',
    fontWeight: 700,
    margin: '0 0 4px',
    letterSpacing: '-0.03em',
    color: '#f0ede8',
  },
  pricingPriceNote: {
    fontSize: '13px',
    color: '#555',
    margin: '0 0 28px',
    minHeight: '20px',
  },
  pricingFeatureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1,
  },
  pricingFeature: {
    fontSize: '14px',
    color: '#888',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pricingFeatureCheck: {
    color: '#0F6E56',
    fontWeight: 700,
    fontSize: '15px',
    flexShrink: 0,
  },
  pricingBtn: {
    width: '100%',
    padding: '14px 24px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'inline-block',
    boxSizing: 'border-box',
    letterSpacing: '-0.01em',
  },
  pricingBtnFree: {
    background: 'transparent',
    color: '#888',
    border: '1px solid #2a2a2a',
  },
  pricingBtnPro: {
    background: '#0F6E56',
    color: 'white',
    border: 'none',
  },
  footer: {
    padding: '32px 24px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#444',
    borderTop: '1px solid #1a1a1a',
    marginTop: 'auto',
  },
  footerLink: {
    color: '#555',
    textDecoration: 'none',
    margin: '0 8px',
  },
};

const avatarColors = ['#0F6E56', '#1a5c4a', '#2d7a65'];
const avatarLetters = ['P', 'N', 'M'];

const steps = [
  {
    n: '01',
    title: 'Create your event',
    desc: 'Pick the event type — trip, dinner, gift, fundraiser. Set the date, location, and what you need covered.',
  },
  {
    n: '02',
    title: 'Invite your group',
    desc: 'Share a link. Guests confirm their spot and see exactly what they owe — before you spend a dollar.',
  },
  {
    n: '03',
    title: 'Collect via Interac',
    desc: 'Guests send their share directly to your bank. You mark them paid. No middleman, no card fees.',
  },
  {
    n: '04',
    title: 'Everyone stays in sync',
    desc: "Live status for the whole group. Who's confirmed, who's paid, what's left to cover — at a glance.",
  },
];

const featuresList = [
  {
    icon: '🍁',
    title: 'Interac-first',
    desc: 'Money moves bank-to-bank. No card fees, no funds held by a platform, no waiting for payouts.',
  },
  {
    icon: '📋',
    title: 'Plan and collect together',
    desc: 'Expenses, headcount, and payments in one place. Stop switching between group chat, spreadsheet, and your bank app.',
  },
  {
    icon: '🎯',
    title: 'Open Pool or Fixed Split',
    desc: 'Run an open pool where people chip in what they want, or split a known cost equally across confirmed guests.',
  },
  {
    icon: '🎁',
    title: 'Group gifts built in',
    desc: 'Surprise gift mode lets guests contribute without revealing the total to the recipient.',
  },
  {
    icon: '📱',
    title: 'Guests need nothing',
    desc: 'No app download required for guests. They get a link, confirm their spot, and send their transfer.',
  },
  {
    icon: '🔒',
    title: 'You hold the money',
    desc: 'Helmr never touches your funds. Everything goes directly between you and your guests via Interac.',
  },
];

export default function LandingPage() {
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    if (hashParams.get('access_token') || queryParams.get('code')) {
      window.location.href = '/app' + window.location.hash + window.location.search;
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) window.location.href = '/app';
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('landing_page_viewed');
    }
  }, []);

  const track = (cta) => {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('landing_cta_clicked', { cta });
    }
  };

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <img src="/logo.svg" alt="Helmr" style={S.brand} />
        <a href="/app" style={S.navLink} onClick={() => track('nav_open_app')}>
          Open app →
        </a>
      </nav>

      <section style={S.hero}>
        <div style={S.eyebrow}>
          <span style={S.eyebrowDot} />
          Built for Canadian groups
        </div>
        <h1 style={S.headline}>
          Collect money{' '}
          <span style={S.headlineAccent}>before</span>
          {' '}the event.
          <br />Not after.
        </h1>
        <p style={S.subhead}>
          Plan group events, split costs, and collect Interac e-Transfers — all in one place. No chasing. No awkward reminders.
        </p>
        <div style={S.ctaRow}>
          <a href="/app" style={S.btnPrimary} onClick={() => track('try_helmr')}>
            Try Helmr free
          </a>
          <a
            href={WAITLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={S.btnSecondary}
            onClick={() => track('waitlist')}
          >
            Get notified
          </a>
        </div>
        <div style={S.socialProof}>
          <div style={S.avatars}>
            {avatarLetters.map((l, i) => (
              <div
                key={l}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '2px solid #0a0a0a',
                  marginLeft: i === 0 ? '0' : '-8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'white',
                  background: avatarColors[i],
                  zIndex: avatarLetters.length - i,
                  position: 'relative',
                }}
              >
                {l}
              </div>
            ))}
          </div>
          <span>Organizers already using Helmr in Canada</span>
        </div>
      </section>

      <div style={S.videoSection}>
        <div style={S.videoPlaceholder}>
          <div style={S.playButton}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <polygon points="6,3 20,12 6,21" />
            </svg>
          </div>
          <span style={S.videoLabel}>See how Helmr works · 90 seconds</span>
        </div>
      </div>

      <div style={S.divider} />

      <section style={S.howItWorks}>
        <div style={S.sectionLabel}>How it works</div>
        <div style={S.stepsGrid}>
          {steps.map((s) => (
            <div key={s.n} style={S.step}>
              <span style={S.stepNumber}>{s.n}</span>
              <h3 style={S.stepTitle}>{s.title}</h3>
              <p style={S.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={S.divider} />

      <section style={S.features}>
        <div style={S.sectionLabel}>Built for Canadian organizers</div>
        <div style={S.featuresGrid}>
          {featuresList.map((f) => (
            <div key={f.title} style={S.featureCard}>
              <span style={S.featureIcon}>{f.icon}</span>
              <h3 style={S.featureTitle}>{f.title}</h3>
              <p style={S.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={S.divider} />

      <section style={S.pricing}>
        <h2 style={S.pricingHeading}>Simple pricing</h2>
        <p style={S.pricingSub}>No transaction fees. No surprises.</p>
        <div style={S.pricingGrid}>
          <div style={{ ...S.pricingCard, ...S.pricingCardFree }}>
            <div style={{ ...S.pricingPlan, color: '#555' }}>Free</div>
            <div style={S.pricingPrice}>$0</div>
            <div style={S.pricingPriceNote}>forever</div>
            <ul style={S.pricingFeatureList}>
              {['1 active event', 'All features included', 'No credit card needed'].map((f) => (
                <li key={f} style={S.pricingFeature}>
                  <span style={S.pricingFeatureCheck}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a href="/app" style={{ ...S.pricingBtn, ...S.pricingBtnFree }} onClick={() => track('pricing_free')}>
              Start free
            </a>
          </div>
          <div style={{ ...S.pricingCard, ...S.pricingCardPro }}>
            <div style={{ ...S.pricingPlan, color: '#0F6E56' }}>Pro</div>
            <div style={{ ...S.pricingPrice, color: '#0F6E56' }}>$7</div>
            <div style={S.pricingPriceNote}>per month · or $60/year</div>
            <ul style={S.pricingFeatureList}>
              {['Unlimited active events', 'All features included', 'Cancel anytime'].map((f) => (
                <li key={f} style={S.pricingFeature}>
                  <span style={S.pricingFeatureCheck}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a href="/app" style={{ ...S.pricingBtn, ...S.pricingBtnPro }} onClick={() => track('pricing_pro')}>
              Get Pro
            </a>
          </div>
        </div>
      </section>

      <footer style={S.footer}>
        <div>
          Made in Canada by Sam ·{' '}
          <a href="mailto:sam@helmr.ca" style={S.footerLink}>sam@helmr.ca</a>
        </div>
        <div style={{ marginTop: '6px', color: '#333' }}>
          © {new Date().getFullYear()} Helmr
        </div>
      </footer>
    </div>
  );
}
