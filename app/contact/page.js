'use client';

import { useState } from 'react';

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #020d0a 0%, #041a12 40%, #071f18 70%, #030e0b 100%)',
    color: '#f0ede8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflowX: 'hidden',
  },
  aurora: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
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
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    boxSizing: 'border-box',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '480px',
    boxSizing: 'border-box',
  },
  heading: {
    fontSize: '32px',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    margin: '0 0 8px',
    color: '#f0ede8',
  },
  subhead: {
    fontSize: '15px',
    color: '#999',
    margin: '0 0 36px',
    lineHeight: 1.5,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  label: {
    fontSize: '13px',
    color: '#aaa',
    fontWeight: 500,
    marginBottom: '6px',
    display: 'block',
    letterSpacing: '0.02em',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    fontSize: '15px',
    color: '#f0ede8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    fontSize: '15px',
    color: '#f0ede8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '120px',
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: '#0F6E56',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  success: {
    textAlign: 'center',
    padding: '20px 0',
  },
  successIcon: {
    fontSize: '40px',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    margin: '0 0 8px',
    color: '#f0ede8',
  },
  successText: {
    fontSize: '15px',
    color: '#999',
    lineHeight: 1.6,
    margin: 0,
  },
  error: {
    fontSize: '13px',
    color: '#e05555',
    marginTop: '12px',
    textAlign: 'center',
  },
  footer: {
    padding: '24px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#444',
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
  footerLink: {
    color: '#666',
    textDecoration: 'none',
  },
};

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to send');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg('Something went wrong. Try emailing sam@helmr.ca directly.');
    }
  };

  const isLoading = status === 'loading';

  return (
    <div style={S.page}>
      <div style={S.aurora}>
        <style>{`
          @keyframes drift1 {
            0%, 100% { transform: translate(0%, 0%) scale(1); }
            33% { transform: translate(20%, -15%) scale(1.1); }
            66% { transform: translate(-10%, 20%) scale(0.95); }
          }
          @keyframes drift2 {
            0%, 100% { transform: translate(0%, 0%) scale(1); }
            33% { transform: translate(-25%, 15%) scale(1.05); }
            66% { transform: translate(15%, -20%) scale(1.1); }
          }
        `}</style>
        <div style={{
          position: 'absolute', width: '70vw', height: '70vw', maxWidth: '800px', maxHeight: '800px',
          borderRadius: '50%', top: '-20%', left: '-10%',
          background: 'radial-gradient(circle, rgba(15,110,86,0.28) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'drift1 20s ease-in-out infinite',
        }}/>
        <div style={{
          position: 'absolute', width: '60vw', height: '60vw', maxWidth: '700px', maxHeight: '700px',
          borderRadius: '50%', bottom: '0%', right: '-15%',
          background: 'radial-gradient(circle, rgba(26,158,120,0.2) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'drift2 26s ease-in-out infinite',
        }}/>
      </div>

      <div style={S.content}>
        <nav style={S.nav}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <img src="/logo.svg" alt="Helmr" style={S.brand} />
          </a>
          <a href="/app" style={S.navLink}>Open app →</a>
        </nav>

        <main style={S.main}>
          <div style={S.card}>
            {status === 'success' ? (
              <div style={S.success}>
                <div style={S.successIcon}>✅</div>
                <h2 style={S.successTitle}>Message sent</h2>
                <p style={S.successText}>
                  Thanks for reaching out. Someone will get back to you soon.
                </p>
              </div>
            ) : (
              <>
                <h1 style={S.heading}>Get in touch</h1>
                <p style={S.subhead}>Have a question or feedback? We'd love to hear from you.</p>

                <div style={S.fieldGroup}>
                  <div>
                    <label style={S.label}>Name</label>
                    <input
                      name="name"
                      type="text"
                      placeholder="Your name"
                      value={form.name}
                      onChange={handleChange}
                      style={S.input}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Email</label>
                    <input
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      style={S.input}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Message</label>
                    <textarea
                      name="message"
                      placeholder="What's on your mind?"
                      value={form.message}
                      onChange={handleChange}
                      style={S.textarea}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !form.name || !form.email || !form.message}
                  style={{ ...S.btn, ...(isLoading ? S.btnDisabled : {}) }}
                >
                  {isLoading ? 'Sending...' : 'Send message'}
                </button>

                {status === 'error' && (
                  <p style={S.error}>{errorMsg}</p>
                )}
              </>
            )}
          </div>
        </main>

        <footer style={S.footer}>
          © {new Date().getFullYear()} Helmr ·{' '}
          <a href="mailto:sam@helmr.ca" style={S.footerLink}>sam@helmr.ca</a>
        </footer>
      </div>
    </div>
  );
}
