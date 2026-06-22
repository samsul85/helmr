'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';
import { BRAND, DS, FONT, TEAL_LIGHT, CARD_BORDER } from '@/lib/design';

export default function AuthScreen({ onSession }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  const sendCode = async (e) => {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          data: {},
        },
      });
      if (otpError) throw otpError;
      setStep('otp');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Could not send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    const token = digits.join('');
    if (token.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'email',
      });
      if (verifyError) throw verifyError;
      if (data.session) {
        trackEvent('auth_completed');
        onSession?.(data.session);
      }
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') verify();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: TEAL_LIGHT,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: FONT,
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '32px 28px',
        maxWidth: '380px',
        width: '100%',
        border: `0.5px solid ${CARD_BORDER}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <img
            src="/logo.svg"
            alt=""
            style={{ height: '48px', width: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>
        <div style={{
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 600,
          color: BRAND,
          marginBottom: '28px',
        }}>
          helmr
        </div>

        {step === 'email' ? (
          <form onSubmit={sendCode}>
            <h1 style={{
              margin: '0 0 20px',
              fontSize: '24px',
              fontWeight: 600,
              textAlign: 'center',
              color: '#1a1a1a',
              letterSpacing: '-0.02em',
            }}>
              Sign in to Helmr
            </h1>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              style={{ ...DS.input, marginBottom: '14px' }}
            />
            {error && (
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#791f1f', textAlign: 'center' }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              style={{ ...DS.btn, ...DS.btnPrimary, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
            <p style={{ margin: '16px 0 0', fontSize: '13px', color: '#888', textAlign: 'center' }}>
              No password needed
            </p>
          </form>
        ) : (
          <form onSubmit={verify}>
            <h1 style={{
              margin: '0 0 10px',
              fontSize: '24px',
              fontWeight: 600,
              textAlign: 'center',
              color: '#1a1a1a',
              letterSpacing: '-0.02em',
            }}>
              Check your email
            </h1>
            <p style={{
              margin: '0 0 24px',
              fontSize: '14px',
              color: '#666',
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              We sent a 6-digit code to {email.trim()}
            </p>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleDigitKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  style={{
                    width: '44px',
                    height: '52px',
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: 600,
                    borderRadius: '12px',
                    border: `0.5px solid ${CARD_BORDER}`,
                    fontFamily: FONT,
                    outline: 'none',
                    background: 'white',
                  }}
                />
              ))}
            </div>

            {error && (
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#791f1f', textAlign: 'center' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              style={{ ...DS.btn, ...DS.btnPrimary, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              style={{ ...DS.btnGhost, width: '100%', marginTop: '12px', fontSize: '14px' }}
              onClick={sendCode}
              disabled={loading}
            >
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
