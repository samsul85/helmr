'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { BRAND, FONT, TEAL_LIGHT } from '@/lib/design';

const AMBER = '#F5A623';

const S = {
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 200,
    fontFamily: FONT,
  },
  modal: {
    background: 'white',
    borderRadius: '20px',
    padding: '28px',
    maxWidth: '380px',
    width: '100%',
  },
  btnGhost: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '14px',
    padding: '8px',
    marginTop: '16px',
    cursor: 'pointer',
    fontFamily: FONT,
    width: '100%',
  },
  btnTeal: {
    width: '100%',
    padding: '18px',
    borderRadius: '999px',
    border: 'none',
    background: BRAND,
    color: 'white',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: FONT,
  },
};

function pillToggle(active) {
  return {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '999px',
    border: active ? 'none' : '0.5px solid #ccc',
    background: active ? BRAND : 'white',
    color: active ? 'white' : '#666',
    cursor: 'pointer',
    fontFamily: FONT,
    fontSize: '14px',
    fontWeight: 500,
  };
}

export default function UpgradeModal({ open, onClose, email }) {
  const [planInterval, setPlanInterval] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setLoading(false);
    }
  }, [open]);

  const startCheckout = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    setLoading(true);
    setError('');

    try {
      let checkoutEmail = typeof email === 'string' ? email.trim() : '';

      if (!checkoutEmail) {
        const supabase = getSupabaseClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('[UpgradeModal] getUser failed:', userError.message);
        }
        checkoutEmail = user?.email?.trim() || '';
      }

      if (!checkoutEmail) {
        setError('Sign in with your email before upgrading.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${window.location.origin}/api/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: checkoutEmail,
          interval: planInterval,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.url) {
        console.error('[UpgradeModal] checkout failed', { status: res.status, data });
        throw new Error(data.error || 'Could not start checkout');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('[UpgradeModal] checkout error:', err);
      setError(err.message || 'Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <img src="/logo.svg" alt="" style={{ height: '48px', width: 'auto', display: 'block', margin: '0 auto' }} />
        </div>
        <div style={{
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 600,
          color: BRAND,
          marginBottom: '24px',
        }}>
          helmr
        </div>

        <h2 style={{
          margin: '0 0 8px',
          fontSize: '28px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          color: '#1a1a1a',
        }}>
          Upgrade to Pro
        </h2>
        <p style={{
          margin: '0 0 28px',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
        }}>
          Unlock unlimited events
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          <div style={{
            border: '0.5px solid #ddd',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#888' }}>Free</div>
            <div style={{ marginBottom: '8px', color: '#888' }}>
              <span style={{ fontSize: '32px', fontWeight: 700 }}>$0</span>
            </div>
            <div style={{ fontSize: '12px', color: '#999', lineHeight: 1.5 }}>
              1 event
              <br />
              All features
            </div>
          </div>
          <div style={{
            border: `2px solid ${BRAND}`,
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
            background: TEAL_LIGHT,
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: BRAND }}>Pro</div>
            <div style={{ marginBottom: '8px', color: BRAND }}>
              <span style={{ fontSize: '32px', fontWeight: 700 }}>$7</span>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>/mo</span>
            </div>
            <div style={{ fontSize: '12px', color: '#085041', lineHeight: 1.5 }}>
              Unlimited events
              <br />
              All features
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            type="button"
            style={pillToggle(planInterval === 'monthly')}
            onClick={() => setPlanInterval('monthly')}
            disabled={loading}
          >
            Monthly
          </button>
          <button
            type="button"
            style={{ ...pillToggle(planInterval === 'yearly'), position: 'relative' }}
            onClick={() => setPlanInterval('yearly')}
            disabled={loading}
          >
            Yearly
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-4px',
              fontSize: '10px',
              fontWeight: 600,
              color: 'white',
              background: AMBER,
              padding: '2px 6px',
              borderRadius: '999px',
              lineHeight: 1.3,
            }}>
              Save 29%
            </span>
          </button>
        </div>

        {error && (
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#791f1f', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          style={{ ...S.btnTeal, opacity: loading ? 0.7 : 1 }}
          onClick={startCheckout}
          disabled={loading}
        >
          {loading ? 'Redirecting…' : 'Upgrade now'}
        </button>
        <button type="button" style={S.btnGhost} onClick={onClose} disabled={loading}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
