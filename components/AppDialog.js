'use client';

import { useEffect, useState } from 'react';
import { BRAND, CARD_BORDER, DS, FONT } from '@/lib/design';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  zIndex: 400,
  fontFamily: FONT,
};

const cardStyle = {
  background: 'white',
  borderRadius: '20px',
  padding: '24px',
  maxWidth: '320px',
  width: '100%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
};

const btnPrimary = {
  flex: 1,
  padding: '14px 16px',
  borderRadius: '999px',
  border: 'none',
  background: BRAND,
  color: 'white',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: FONT,
};

const btnCancel = {
  flex: 1,
  padding: '14px 16px',
  borderRadius: '999px',
  border: `0.5px solid ${CARD_BORDER}`,
  background: 'white',
  color: '#666',
  fontSize: '15px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: FONT,
};

export default function AppDialog({ dialog, onClose }) {
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    if (dialog?.type === 'prompt') {
      setPromptValue(dialog.defaultValue || '');
    }
  }, [dialog]);

  if (!dialog) return null;

  const handleConfirm = () => {
    if (dialog.type === 'prompt') {
      dialog.onConfirm?.(promptValue);
    } else {
      dialog.onConfirm?.();
    }
    onClose();
  };

  const handleCancel = () => {
    dialog.onCancel?.();
    onClose();
  };

  const confirmLabel = dialog.confirmLabel || (
    dialog.type === 'alert' ? 'OK' : dialog.type === 'prompt' ? 'Add' : 'Confirm'
  );

  const isSingleButton = dialog.type === 'alert';

  return (
    <div
      style={overlayStyle}
      onClick={isSingleButton ? handleConfirm : handleCancel}
    >
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        {dialog.title && (
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, fontFamily: FONT, color: '#1a1a1a' }}>
            {dialog.title}
          </h3>
        )}
        <p style={{ margin: '0 0 16px', color: '#666', fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {dialog.message}
        </p>

        {dialog.type === 'prompt' && (
          <input
            autoFocus
            value={promptValue}
            onChange={e => setPromptValue(e.target.value)}
            placeholder={dialog.placeholder || ''}
            style={{ ...DS.input, marginBottom: '16px' }}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
          />
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          {!isSingleButton && (
            <button type="button" style={btnCancel} onClick={handleCancel}>
              Cancel
            </button>
          )}
          <button
            type="button"
            style={{ ...btnPrimary, ...(isSingleButton ? { width: '100%', flex: undefined } : {}) }}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function createDialogHelpers(setDialog) {
  return {
    alert: (message, title = '') => new Promise(resolve => {
      setDialog({
        type: 'alert',
        title,
        message,
        onConfirm: resolve,
      });
    }),
    confirm: (message, title = '') => new Promise(resolve => {
      setDialog({
        type: 'confirm',
        title,
        message,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    }),
    prompt: (message, defaultValue = '', title = '') => new Promise(resolve => {
      setDialog({
        type: 'prompt',
        title,
        message,
        defaultValue,
        confirmLabel: 'Add',
        onConfirm: (value) => resolve(value),
        onCancel: () => resolve(null),
      });
    }),
  };
}
