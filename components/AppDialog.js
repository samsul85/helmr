'use client';

import { useEffect, useState } from 'react';
import { BRAND, DS, FONT } from '@/lib/design';

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

  return (
    <div style={DS.modalOverlay} onClick={dialog.type === 'alert' ? handleConfirm : handleCancel}>
      <div style={DS.modal} onClick={e => e.stopPropagation()}>
        {dialog.title && (
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 500, fontFamily: FONT }}>
            {dialog.title}
          </h3>
        )}
        <p style={{ margin: '0 0 16px', color: '#555', fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {dialog.message}
        </p>

        {dialog.type === 'prompt' && (
          <input
            autoFocus
            value={promptValue}
            onChange={e => setPromptValue(e.target.value)}
            style={{ ...DS.input, marginBottom: '16px' }}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
          />
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          {dialog.type !== 'alert' && (
            <button type="button" style={{ ...DS.btn, flex: 1 }} onClick={handleCancel}>
              Cancel
            </button>
          )}
          <button
            type="button"
            style={{ ...DS.btn, ...DS.btnPrimary, flex: 1, border: 'none' }}
            onClick={handleConfirm}
          >
            {dialog.confirmLabel || (dialog.type === 'alert' ? 'OK' : 'Confirm')}
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
        onConfirm: (value) => resolve(value),
        onCancel: () => resolve(null),
      });
    }),
  };
}
