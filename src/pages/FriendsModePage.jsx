// src/pages/FriendsModePage.jsx
import React from "react";

/*
  صفحهٔ ورود به بخش Multiplayer (دوستان).
  دو گزینه: لیست روم‌ها / ساخت روم
*/
export default function FriendsModePage({ onNavigate }) {
  const go = (path) => {
    if (typeof onNavigate === 'function') return onNavigate(path);
    // no router/navigation provided — avoid throwing (this component may be rendered standalone)
    console.warn('FriendsModePage: onNavigate not provided, cannot navigate to', path);
  };

  return (
    <div className="card">
      <h2 style={{ fontWeight: 800 }}>بازی با دوستان</h2>
      <p style={{ color: 'var(--muted)' }}>دو حالت: پیوستن به رومی آماده یا ساخت روم جدید و دعوت.</p>

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button className="btn" onClick={() => go('/friends/list')}>ورود به لیست روم‌ها</button>
        <button className="btn" onClick={() => go('/friends/create')}>ساخت روم جدید</button>
      </div>
    </div>
  );
}
