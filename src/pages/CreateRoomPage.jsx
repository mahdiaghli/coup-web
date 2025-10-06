// src/pages/CreateRoomPage.jsx
import React, { useState } from "react";
import { createRoom, joinRoom } from "../utils/roomManager";
import { useNavigate } from "react-router-dom";

export default function CreateRoomPage({ me }) {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [botsCount, setBotsCount] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");

  function onCreate() {
    const room = createRoom({
      name: name || `روم ${new Date().toLocaleTimeString()}`,
      password: password || null,
      maxPlayers,
      botsCount,
      difficulty,
      host: me
    });
    // auto join host
    const res = joinRoom(room.id, me, password || null);
    if (!res.ok) { alert(res.err); return; }
    nav(`/friends/room/${room.id}`);
  }

  return (
    <div className="card">
      <div style={{fontWeight:800}}>ساخت روم جدید</div>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
        <input placeholder="نام روم (اختیاری)" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="رمز (اختیاری)" value={password} onChange={e=>setPassword(e.target.value)} />
        <div style={{display:'flex',gap:8}}>
          <label>حداکثر بازیکن:</label>
          <input type="number" value={maxPlayers} onChange={e=>setMaxPlayers(Math.max(2,Math.min(6,Number(e.target.value)||2)))} style={{width:80}} />
        </div>
        <div style={{display:'flex',gap:8}}>
          <label>تعداد ربات:</label>
          <input type="number" value={botsCount} onChange={e=>setBotsCount(Math.max(0,Math.min(5,Number(e.target.value)||0)))} style={{width:80}} />
        </div>
        <div style={{display:'flex',gap:8}}>
          <label>سختی:</label>
          <select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
            <option value="easy">آسان</option>
            <option value="medium">متوسط</option>
            <option value="hard">سخت</option>
          </select>
        </div>

        <div style={{display:'flex',gap:8}}>
          <button className="btn" onClick={onCreate}>ساخت و ورود</button>
          <button className="btn" onClick={()=>nav('/mode')}>بازگشت</button>
        </div>
      </div>
    </div>
  );
}
