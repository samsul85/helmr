'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  page: { minHeight: '100vh', background: '#f5f3ee', padding: '12px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  frame: { maxWidth: '420px', width: '100%', background: 'white', borderRadius: '20px', padding: '40px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
  title: { fontSize: '28px', fontWeight: 500, margin: '0 0 8px', textAlign: 'center' },
  sub: { fontSize: '14px', color: '#666', textAlign: 'center', margin: '0 0 32px' },
  label: { fontSize: '12px', color: '#777', marginBottom: '4px', display: 'block' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', border: '0.5px solid #ddd', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' },
  btn: { width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#1a1a1a', color: 'white', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginTop: '12px' },
  note: { fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '16px' },
};

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) return (
    <div style={S.page}>
      <div style={S.frame}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
          <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 8px' }}>Check your email</h2>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>We sent a sign-in link to <strong>{email}</strong>. Click it to continue.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.frame}>
        <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '12px' }}>⚓</div>
        <h1 style={S.title}>Helmr</h1>
        <p style={S.sub}>Enter your email to sign in or create an account</p>
        <label style={S.label}>Email</label>
        <input
          style={S.input}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          autoFocus
        />
        {error && <p style={{ fontSize: '13px', color: '#a55', marginTop: '8px' }}>{error}</p>}
        <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSend}>
          {loading ? 'Sending…' : 'Send sign-in link'}
        </button>
        <p style={S.note}>No password needed. Works on any device.</p>
      </div>
    </div>
  );
}
