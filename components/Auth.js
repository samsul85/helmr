'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

const S = {
  page: {
    minHeight: '100vh',
    background: '#f5f3ee',
    padding: '12px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'white',
    borderRadius: '20px',
    padding: '32px 24px',
    boxSizing: 'border-box',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    border: '0.5px solid #eee',
    textAlign: 'center',
  },
  logo: {
    fontSize: '52px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '28px',
    lineHeight: 1.15,
    margin: '0 0 8px',
    fontWeight: 500,
    color: '#1a1a1a',
  },
  copy: {
    margin: '0 0 24px',
    fontSize: '15px',
    lineHeight: 1.45,
    color: '#666',
  },
  label: {
    display: 'block',
    textAlign: 'left',
    fontSize: '12px',
    color: '#777',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '14px 12px',
    borderRadius: '10px',
    border: '0.5px solid #ddd',
    fontSize: '15px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: '12px',
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: '#1a1a1a',
    color: 'white',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  message: {
    margin: '14px 0 0',
    fontSize: '13px',
    lineHeight: 1.4,
    color: '#085041',
  },
  error: {
    margin: '14px 0 0',
    fontSize: '13px',
    lineHeight: 1.4,
    color: '#791f1f',
  },
};

export default function Auth() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const sendMagicLink = async (event) => {
    event.preventDefault();
    setStatus('');
    setError('');
    setSending(true);

    try {
      const supabase = getSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signInError) throw signInError;

      setStatus('Check your email for a secure sign-in link.');
    } catch (err) {
      setError(err?.message || 'Could not send the magic link. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>⚓</div>
        <h1 style={S.title}>Sign in to Helmr</h1>
        <p style={S.copy}>
          Enter your email and we&apos;ll send you a magic link. No password needed.
        </p>

        <form onSubmit={sendMagicLink}>
          <label htmlFor="email" style={S.label}>Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            style={S.input}
          />
          <button
            type="submit"
            disabled={sending}
            style={{ ...S.button, opacity: sending ? 0.65 : 1, cursor: sending ? 'wait' : 'pointer' }}
          >
            {sending ? 'Sending link...' : 'Send magic link'}
          </button>
        </form>

        {status && <p style={S.message}>{status}</p>}
        {error && <p style={S.error}>{error}</p>}
      </div>
    </div>
  );
}
