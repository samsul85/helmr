'use client';

import { BRAND, FONT } from '@/lib/design';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'guests', label: 'Guests', icon: '👥' },
  { id: 'expenses', label: 'Expenses', icon: '💰' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function BottomNav({ activeTab, onTabChange, onNewEvent }) {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '420px',
      background: 'white',
      borderTop: '0.5px solid #e8e4d8',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      padding: '8px 12px 12px',
      boxSizing: 'border-box',
      zIndex: 150,
      fontFamily: FONT,
    }}>
      {NAV_ITEMS.slice(0, 2).map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTabChange(item.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 12px',
            textAlign: 'center',
            color: activeTab === item.id ? BRAND : '#888',
            fontFamily: FONT,
            flex: 1,
          }}
        >
          <div style={{ fontSize: '20px', marginBottom: '2px' }}>{item.icon}</div>
          <div style={{ fontSize: '10px', fontWeight: activeTab === item.id ? 600 : 400 }}>{item.label}</div>
        </button>
      ))}

      <button
        type="button"
        onClick={onNewEvent}
        aria-label="Plan new event"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '999px',
          background: BRAND,
          color: 'white',
          border: 'none',
          fontSize: '28px',
          lineHeight: 1,
          cursor: 'pointer',
          margin: '0 4px 4px',
          boxShadow: '0 4px 14px rgba(15,110,86,0.35)',
          flexShrink: 0,
        }}
      >
        +
      </button>

      {NAV_ITEMS.slice(2).map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTabChange(item.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 12px',
            textAlign: 'center',
            color: activeTab === item.id ? BRAND : '#888',
            fontFamily: FONT,
            flex: 1,
          }}
        >
          <div style={{ fontSize: '20px', marginBottom: '2px' }}>{item.icon}</div>
          <div style={{ fontSize: '10px', fontWeight: activeTab === item.id ? 600 : 400 }}>{item.label}</div>
        </button>
      ))}
    </nav>
  );
}
