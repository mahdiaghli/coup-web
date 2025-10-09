import React, { useEffect, useState } from 'react';
import { listRooms, joinRoom } from '../utils/roomManager';

export default function FriendsListPage({ me, onBack, onJoin }) {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    setRooms(listRooms());
    const h = () => setRooms(listRooms());
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);

  return (
    <div className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontWeight:800}}>لیست روم‌ها</div>
        <div><button className="btn" onClick={onBack}>بازگشت</button></div>
      </div>
      <div style={{marginTop:12,display:'grid',gap:8}}>
        {rooms.length === 0 && <div style={{color:'#6b7280'}}>هیچ رومی وجود ندارد.</div>}
        {rooms.map(r => (
          <div key={r.id} className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:700}}>{r.name}</div>
              <div style={{fontSize:13,color:'#6b7280'}}>بازیکن: {r.players.length}/{r.maxPlayers} • ربات: {r.botsCount} • سطح: {r.difficulty}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn" onClick={() => {
                const res = joinRoom(r.id, me, r.password || null);
                if (!res.ok) return alert(res.err);
                onJoin(r.id);
              }}>پیوستن</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
