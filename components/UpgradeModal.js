'use client';

import { useState } from 'react';

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
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    maxWidth: '420px',
    width: '100%',
  },
  btnGhost: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    fontSize: '13px',
    padding: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
  },
  btnTeal: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: '#0F6E56',
    color: 'white',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  planOption: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '0.5px solid #ddd',
    background: 'white',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
    marginBottom: '10px',
  },
  planOptionSelected: {
    border: '2px solid #0F6E56',
    background: '#f0faf7',
  },
};

export default function UpgradeModal({ open, onClose, email }) {
  const [interval, setInterval] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const startCheckout = async () => {
    if (!email) {
      setError('Sign in with your email before upgrading.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, interval }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not start checkout');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err.message || 'Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img src="/logo.svg" alt="Helmr" style={{ height: '48px', width: 'auto' }} />
        </div>
        <h2 style={{ margin: '0 0 16px', fontSize: '22px', fontWeight: 500, textAlign: 'center' }}>
          Upgrade to Pro
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div style={{ border: '0.5px solid #eee', borderRadius: '12px', padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Free</div>
            <div style={{ fontSize: '20px', fontWeight: 500, marginBottom: '4px' }}>$0</div>
            <div style={{ fontSize: '11px', color: '#777', lineHeight: 1.45 }}>
              1 event
              <br />
              All features
            </div>
          </div>
          <div style={{
            border: '2px solid #0F6E56',
            borderRadius: '12px',
            padding: '14px 10px',
            textAlign: 'center',
            background: '#f0faf7',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#0F6E56' }}>Pro</div>
            <div style={{ fontSize: '20px', fontWeight: 500, marginBottom: '4px', color: '#0F6E56' }}>
              $7<span style={{ fontSize: '12px', fontWeight: 400 }}>/mo</span>
            </div>
            <div style={{ fontSize: '11px', color: '#085041', lineHeight: 1.45 }}>
              or $60/year
              <br />
              Unlimited events
              <br />
              All features
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            style={{
              ...S.planOption,
              ...(interval === 'monthly' ? S.planOptionSelected : {}),
            }}
            onClick={() => setInterval('monthly')}
            disabled={loading}
          >
            <div style={{ fontSize: '14px', fontWeight: 500, color: interval === 'monthly' ? '#0F6E56' : '#1a1a1a' }}>
              Monthly
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>$7/month</div>
          </button>
          <button
            type="button"
            style={{
              ...S.planOption,
              ...(interval === 'yearly' ? S.planOptionSelected : {}),
              marginBottom: 0,
            }}
            onClick={() => setInterval('yearly')}
            disabled={loading}
          >
            <div style={{ fontSize: '14px', fontWeight: 500, color: interval === 'yearly' ? '#0F6E56' : '#1a1a1a' }}>
              Yearly
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
              $60/year <span style={{ color: '#0F6E56' }}>· save 29%</span>
            </div>
          </button>
        </div>

        {error && (
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#791f1f', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          style={{ ...S.btnTeal, marginBottom: '8px', opacity: loading ? 0.7 : 1 }}
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
