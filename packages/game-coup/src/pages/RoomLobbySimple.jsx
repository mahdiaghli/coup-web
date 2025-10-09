import React, { useEffect, useState } from 'react';
import { getRoom, subscribe, leaveRoom, setRoomStarted } from '../utils/roomManager';

export default function RoomLobbySimple({ roomId, me, onBack, onStart }) {
  const [room, setRoom] = useState(() => getRoom(roomId));

  useEffect(()=>{
    const unsub = subscribe(()=> setRoom(getRoom(roomId)) );
    return unsub;
  }, [roomId]);

  useEffect(()=>{
    if (!room) return;
    if (room.started) {
      if (onStart) onStart(room);
    } else if (room.players.length >= room.maxPlayers) {
      setRoomStarted(room.id, true);
    }
  }, [room?.started, room?.players?.length]);

  if (!room) return <div className="card">روم یافت نشد</div>;

  function leave() {
    leaveRoom(room.id, me.id);
    onBack();
  }

  return (
    <div className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontWeight:800}}>{room.name}</div>
          <div style={{fontSize:13,color:'#6b7280'}}>حالت: {room.difficulty} — بازیکنان: {room.players.length}/{room.maxPlayers}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn" onClick={leave}>خروج</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        <div style={{fontWeight:700}}>بازیکنان حاضر</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
          {room.players.map(p=>(
            <div key={p.id} className="card" style={{padding:8}}>
              <div style={{fontWeight:700}}>{p.name}{p.isBot ? ' (ربات)' : ''}</div>
              <div style={{fontSize:12,color:'#6b7280'}}>سکه: {p.coins ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:12,color:'var(--muted)'}}>وقتی تعداد بازیکنان به حد نصاب برسد، بازی به صورت خودکار شروع می‌شود.</div>
    </div>
  );
}
