'use client';

import { useState } from 'react';
import { BRAND, CARD_BORDER, FONT } from '@/lib/design';

const NAV_ITEMS = {
  home: { id: 'home', label: 'Home', icon: 'ti-home' },
  profile: { id: 'profile', label: 'Profile', icon: 'ti-user' },
  activity: { id: 'activity', label: 'Activity', icon: 'ti-chart-bar' },
  guests: { id: 'guests', label: 'Guests', icon: 'ti-users' },
  expenses: { id: 'expenses', label: 'Expenses', icon: 'ti-receipt' },
  settings: { id: 'settings', label: 'Settings', icon: 'ti-settings' },
};

export default function BottomNav({ activeTab, isWelcome, onHome, onProfile, onActivity, onTabChange, onNewEvent, profileOpen }) {
  const [tappedId, setTappedId] = useState(null);

  const leftItems = isWelcome
    ? [NAV_ITEMS.profile]
    : [NAV_ITEMS.home, NAV_ITEMS.guests];

  const rightItems = isWelcome
    ? [NAV_ITEMS.activity]
    : [NAV_ITEMS.expenses, NAV_ITEMS.settings];

  const handleTap = (itemId, action) => {
    setTappedId(itemId);
    setTimeout(() => setTappedId(null), 150);
    action();
  };

  const renderItem = (item) => {
    const isActive = item.id === 'profile'
      ? profileOpen
      : item.id === 'home'
        ? false
        : item.id === 'activity'
          ? false
          : item.id === 'guests'
            ? activeTab === 'people'
            : item.id === 'settings'
              ? activeTab === 'extras'
              : activeTab === item.id;

    const isTapped = tappedId === item.id;

    const onClick = () => {
      if (item.id === 'profile') handleTap(item.id, onProfile);
      else if (item.id === 'home') handleTap(item.id, onHome);
      else if (item.id === 'activity') handleTap(item.id, onActivity);
      else handleTap(item.id, () => onTabChange(item.id));
    };

    return (
      <button
        key={item.id}
        type="button"
        onClick={onClick}
        className="helmr-pressable"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          textAlign: 'center',
          color: isActive ? BRAND : '#aaa',
          fontFamily: FONT,
          flex: 1,
          minWidth: 0,
        }}
      >
        <i
          className={`ti ${item.icon}${isTapped ? ' helmr-nav-icon-pop' : ''}`}
          style={{ fontSize: '20px', display: 'block', marginBottom: '2px' }}
        />
        <div
          className={isTapped || isActive ? 'helmr-nav-label-active' : undefined}
          style={{
            fontSize: '10px',
            fontWeight: isActive ? 600 : 400,
            transition: 'color 150ms ease-out',
            color: isActive ? BRAND : '#aaa',
          }}
        >
          {item.label}
        </div>
      </button>
    );
  };

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '420px',
      background: 'white',
      borderTop: `0.5px solid ${CARD_BORDER}`,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      padding: '12px 8px 20px',
      boxSizing: 'border-box',
      zIndex: 150,
      fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', flex: 1, justifyContent: isWelcome ? 'flex-start' : 'space-around' }}>
        {leftItems.map(renderItem)}
      </div>

      <button
        type="button"
        onClick={() => handleTap('plus', onNewEvent)}
        aria-label="Plan new event"
        className="helmr-pressable"
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
          marginTop: '-20px',
          marginBottom: '4px',
          boxShadow: '0 4px 14px rgba(15,110,86,0.35)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <i className={`ti ti-plus${tappedId === 'plus' ? ' helmr-nav-icon-pop' : ''}`} style={{ fontSize: '24px' }} />
      </button>

      <div style={{ display: 'flex', flex: 1, justifyContent: isWelcome ? 'flex-end' : 'space-around' }}>
        {rightItems.map(renderItem)}
      </div>
    </nav>
  );
}
