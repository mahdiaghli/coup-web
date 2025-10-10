// src/components/RoomsList.jsx
import React, { useEffect, useState } from "react";
import { listRooms, subscribe, joinRoom, removeRoom } from "../utils/roomManager";
import { useNavigate } from "react-router-dom";

export default function RoomsList({ me }) {
  const nav = useNavigate();
  const [rooms, setRooms] = useState(listRooms());
  useEffect(()=> subscribe(setRooms), []);

  async function onJoin(r) {
    // ensure a per-browser display name (persisted in sessionStorage)
    let displayName = null;
    try {
      displayName = sessionStorage.getItem('gw_display_name');
    } catch (e) {}
    if (!displayName) {
      const ans = prompt('نام نمایشی خود را وارد کنید (نمایش در روم):', 'شما');
      if (ans === null) return; // cancelled
      displayName = ans.trim() || 'شما';
      try { sessionStorage.setItem('gw_display_name', displayName); } catch (e) {}
    }

    const playerObj = { ...me, name: displayName };
    if (r.password) {
      const pwd = prompt("رمز روم را وارد کنید:");
      if (pwd === null) return;
      const res = joinRoom(r.id, playerObj, pwd);
      if (!res.ok) return alert(res.err);
      nav(`/friends/room/${r.id}`);
    } else {
      const res = joinRoom(r.id, playerObj, null);
      if (!res.ok) return alert(res.err);
      nav(`/friends/room/${r.id}`);
    }
  }

  return (
    <div className="card">
      <div style={{fontWeight:800}}>روم‌های موجود</div>
      <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:8}}>
        {rooms.length === 0 && <div style={{color:'#6b7280'}}>روم فعالی وجود ندارد.</div>}
        {rooms.map(r=>(
          <div key={r.id} className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:700}}>{r.name}</div>
              <div style={{fontSize:13,color:'#6b7280'}}>بازیکنان: {r.players.length}/{r.maxPlayers} — سختی: {r.difficulty}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn" onClick={()=>nav(`/friends/room/${r.id}`)}>نمایش</button>
              <button className="btn" onClick={()=>onJoin(r)}>پیوستن</button>
              {r.hostId === me.id && (
                <button
                  className="btn"
                  style={{ background: '#ef4444', color: '#fff' }}
                  onClick={() => {
                    if (!confirm('آیا از حذف این روم مطمئن هستید؟')) return;
                    const res = removeRoom(r.id, me.id);
                    if (!res.ok) return alert(res.err || 'خطا در حذف روم');
                    // refresh local list
                    setRooms(listRooms());
                  }}
                >حذف</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
