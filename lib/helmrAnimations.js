'use client';

import { useState, useEffect } from 'react';

export const SCREEN_ORDER = {
  welcome: 0,
  chooseType: 1,
  details: 2,
  dashboard: 3,
};

export const HELMR_ANIMATION_CSS = `
  .helmr-pressable {
    transition: transform 150ms ease-out;
    -webkit-tap-highlight-color: transparent;
  }
  .helmr-pressable:active:not(:disabled) {
    transform: scale(0.96);
  }
  button:not(:disabled) {
    transition: transform 150ms ease-out;
    -webkit-tap-highlight-color: transparent;
  }
  button:not(:disabled):active {
    transform: scale(0.96);
  }

  @keyframes helmr-slide-in-forward {
    from { transform: translateX(100%); opacity: 0.85; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes helmr-slide-in-back {
    from { transform: translateX(-100%); opacity: 0.85; }
    to { transform: translateX(0); opacity: 1; }
  }
  .helmr-screen-forward {
    animation: helmr-slide-in-forward 280ms ease-out forwards;
  }
  .helmr-screen-back {
    animation: helmr-slide-in-back 280ms ease-out forwards;
  }

  @keyframes helmr-success-check {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes helmr-success-fade {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }
  .helmr-success-check {
    animation: helmr-success-check 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  .helmr-success-overlay-fade {
    animation: helmr-success-fade 300ms ease-out 600ms forwards;
  }

  @keyframes helmr-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .helmr-skeleton {
    background: linear-gradient(90deg, #eeeae0 25%, #f5f3ee 50%, #eeeae0 75%);
    background-size: 200% 100%;
    animation: helmr-shimmer 1.2s ease-in-out infinite;
    border-radius: 8px;
  }

  @keyframes helmr-nav-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  .helmr-nav-icon-pop {
    animation: helmr-nav-pop 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
    display: inline-block;
  }
  .helmr-nav-label-active {
    color: #0F6E56 !important;
    font-weight: 600 !important;
    transition: color 150ms ease-out;
  }

  @keyframes helmr-spin {
    to { transform: rotate(360deg); }
  }
  .helmr-pull-spinner {
    animation: helmr-spin 0.8s linear infinite;
  }
`;

export function useCountUp(target, active, duration = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const numTarget = Number(target) || 0;
    let startTime = null;
    let rafId = 0;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(numTarget * eased));
      if (progress < 1) rafId = requestAnimationFrame(step);
      else setValue(numTarget);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, active, duration]);

  return value;
}

export function useAnimatedWidth(targetPct, active, delay = 50, duration = 800) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!active) {
      setWidth(0);
      return;
    }
    const timer = setTimeout(() => setWidth(Math.max(0, Math.min(100, targetPct))), delay);
    return () => clearTimeout(timer);
  }, [targetPct, active, delay]);

  return {
    width,
    transition: `width ${duration}ms ease-out`,
  };
}

export function SkeletonEventCards({ count = 3 }) {
  return (
    <div style={{ padding: '20px 16px' }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            background: 'white',
            borderRadius: '18px',
            border: '0.5px solid #e8e4d8',
            padding: '16px',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div className="helmr-skeleton" style={{ width: 48, height: 48, borderRadius: '14px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="helmr-skeleton" style={{ height: 14, width: '70%', marginBottom: 8 }} />
              <div className="helmr-skeleton" style={{ height: 12, width: '45%' }} />
            </div>
          </div>
          <div className="helmr-skeleton" style={{ height: 4, width: '100%', borderRadius: '999px' }} />
        </div>
      ))}
    </div>
  );
}

export function SuccessOverlay({ visible }) {
  if (!visible) return null;
  return (
    <div
      className="helmr-success-overlay-fade"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(245, 243, 238, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 400,
      }}
    >
      <div
        className="helmr-success-check"
        style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: '#0F6E56',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(15,110,86,0.35)',
        }}
      >
        <i className="ti ti-check" style={{ fontSize: 44, color: 'white' }} />
      </div>
    </div>
  );
}
