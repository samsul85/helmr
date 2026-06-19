export const BRAND = '#0F6E56';
export const CREAM = '#F5F3EE';
export const CARD_BORDER = '#e8e4d8';
export const TEAL_LIGHT = '#E1F5EE';
export const TEXT_DARK = '#085041';

export const EVENT_COLORS = {
  fundraiser: '#F5A623',
  potluck: '#639922',
  gift: '#E8645A',
  team: '#2C3E6B',
  grad: '#534AB7',
  trip: '#185FA5',
  dinner: '#D85A30',
  bday: '#D4537E',
  concert: '#534AB7',
  golf: '#3B6D11',
  bach: '#993556',
  offsite: '#2C3E6B',
  beach: '#378ADD',
  other: '#0F6E56',
};

export function getEventColor(eventTypeId) {
  return EVENT_COLORS[eventTypeId] || EVENT_COLORS.other;
}

export const STATUS_STYLES = {
  paid: { bg: '#e1f5ee', fg: BRAND },
  confirmed: { bg: '#fef3e0', fg: '#F5A623' },
  invited: { bg: '#eeeae0', fg: '#666' },
  declined: { bg: '#fce8e4', fg: '#E8645A' },
};

export const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const DS = {
  page: {
    minHeight: '100vh',
    background: CREAM,
    padding: '12px',
    boxSizing: 'border-box',
    fontFamily: FONT,
  },
  frame: {
    maxWidth: '420px',
    margin: '0 auto',
    background: CREAM,
    borderRadius: '20px',
    minHeight: '85vh',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  screenBody: {
    flex: 1,
    overflow: 'auto',
    paddingBottom: '100px',
  },
  card: {
    background: 'white',
    border: `0.5px solid ${CARD_BORDER}`,
    borderRadius: '18px',
    padding: '16px',
    marginBottom: '12px',
  },
  label: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '6px',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 500,
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: BRAND,
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '999px',
    border: '0.5px solid #ddd',
    fontSize: '15px',
    fontFamily: FONT,
    boxSizing: 'border-box',
    outline: 'none',
    background: 'white',
  },
  btn: {
    width: '100%',
    padding: '16px',
    borderRadius: '999px',
    border: `0.5px solid ${CARD_BORDER}`,
    background: 'white',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 500,
    fontFamily: FONT,
  },
  btnPrimary: {
    background: BRAND,
    color: 'white',
    border: 'none',
  },
  btnGhost: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    fontSize: '13px',
    padding: '8px',
    cursor: 'pointer',
    fontFamily: FONT,
  },
  pill: {
    fontSize: '11px',
    padding: '4px 12px',
    borderRadius: '999px',
    fontWeight: 500,
    cursor: 'pointer',
    userSelect: 'none',
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 500,
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 300,
  },
  modal: {
    background: 'white',
    borderRadius: '18px',
    padding: '20px',
    maxWidth: '420px',
    width: '100%',
    fontFamily: FONT,
  },
  stickyBottom: {
    position: 'sticky',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px 16px 16px',
    background: `linear-gradient(transparent, ${CREAM} 24%)`,
    zIndex: 10,
  },
  feedbackBtn: {
    position: 'fixed',
    bottom: '100px',
    right: '20px',
    background: BRAND,
    color: 'white',
    border: 'none',
    borderRadius: '999px',
    padding: '12px 18px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(15,110,86,0.3)',
    zIndex: 100,
    fontFamily: FONT,
  },
};
