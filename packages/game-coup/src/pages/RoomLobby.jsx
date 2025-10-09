// src/pages/RoomLobby.jsx
import React, { useEffect, useState } from "react";
import { getRoom, subscribe, joinRoom, leaveRoom, setRoomStarted } from "../utils/roomManager";
import { useParams, useNavigate } from "react-router-dom";

/*
 Props:
  - me: {id, name, isHuman}
  - onStart(room) => callback when room starts (host or auto)
*/
export default function RoomLobby({ me, onStart }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [room, setRoom] = useState(() => getRoom(id));
  useEffect(()=> {
    const unsub = subscribe(()=>{
      setRoom(getRoom(id));
    });
    // ensure we are joined
    const r = getRoom(id);
    if (!r) { alert('روم پیدا نشد'); nav('/friends/list'); }
    return unsub;
  }, [id]);

  useEffect(()=> {
    // auto-join if not member and room exists (useful when user navigates via link)
    const r = getRoom(id);
    if (!r) return;
    if (!r.players.some(p=>p.id === me.id)) {
      const res = joinRoom(id, me, r.password || null);
      if (!res.ok) {
        // password protected -> redirect to list
        alert(res.err);
        nav('/friends/list');
      }
    }
  }, [id]);

  if (!room) return <div className="card">روم پیدا نشد.</div>;

  const amHost = room.hostId === me.id;
  const amIn = room.players.some(p => p.id === me.id);

  function copyLink() {
    const link = `${window.location.origin}${window.location.pathname.replace(/\/room\/.*/, '')}/friends/room/${room.id}`;
    navigator.clipboard?.writeText(link).then(()=>alert("لینک کپی شد"));
  }

  function leave() {
    leaveRoom(room.id, me.id);
    nav('/friends/list');
  }

  function tryStart() {
    // only host can forcibly start
    if (!amHost) return alert('فقط میزبان می‌تواند بازی را شروع کند.');
    setRoomStarted(room.id, true);
    // notify via manager; onStart will be triggered by a side-effect below (watch started flag)
  }

  useEffect(()=>{
    if (!room) return;
    if (room.started) {
      // call onStart with room data
      if (onStart) onStart(room);
    } else {
      // if players reached capacity -> auto start
      if (room.players.length >= room.maxPlayers) {
        setRoomStarted(room.id, true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.started, room?.players?.length]);

  return (
    <div className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontWeight:800}}>{room.name}</div>
          <div style={{fontSize:13,color:'#6b7280'}}>حالت: {room.difficulty} — بازیکنان: {room.players.length}/{room.maxPlayers}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn" onClick={copyLink}>کپی لینک</button>
          {amHost && <button className="btn" onClick={tryStart}>شروع بازی (میزبان)</button>}
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

      <div style={{marginTop:12,color:'var(--muted)'}}>
        اگر میزبان باشد و تعداد بازیکنان به حد نصاب برسد، بازی به طور خودکار شروع خواهد شد.
      </div>
    </div>
  );
}
