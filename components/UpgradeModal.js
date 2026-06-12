'use client';

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
};

export default function UpgradeModal({ open, onClose, onUpgrade }) {
  if (!open) return null;

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

        <button
          type="button"
          style={{ ...S.btnTeal, marginBottom: '8px' }}
          onClick={onUpgrade}
        >
          Upgrade now
        </button>
        <button type="button" style={S.btnGhost} onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
