// src/pages/SetupPage.jsx
import React from "react";

export default function SetupPage({ numPlayers, setNumPlayers, difficulty, setDifficulty, onStart }) {
  return (
    <div className="card" style={{display:'grid',gridTemplateColumns:'1fr',gap:12}}>
      <div style={{fontWeight:800,fontSize:18}}>تنظیمات بازی</div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>
          <label style={{display:'block',fontWeight:700,marginBottom:8}}>تعداد بازیکنان</label>
          <select className="select" value={numPlayers} onChange={(e)=>setNumPlayers(parseInt(e.target.value))}>
            {[2,3,4,5,6].map(n=> <option key={n} value={n}>{n} بازیکن</option>)}
          </select>
        </div>

        <div>
          <label style={{display:'block',fontWeight:700,marginBottom:8}}>سختی ربات‌ها</label>
          <select className="select" value={difficulty} onChange={(e)=>setDifficulty(e.target.value)}>
            <option value="easy">آسان</option>
            <option value="medium">متوسط</option>
            <option value="hard">سخت</option>
          </select>
        </div>
      </div>

      <div style={{display:'flex',gap:10}}>
        <button className="btn-primary btn" onClick={onStart}>شروع بازی</button>
        <button className="btn" onClick={()=>{ setNumPlayers(3); setDifficulty('medium'); }}>تنظیمات پیش‌فرض</button>
      </div>

      <div style={{color: 'var(--muted)', fontSize:13}}>
        نکته: در طول بازی می‌توانید کارت‌ها را ببینید، اکشن‌ها را ادعا و چلنج کنید، و برای هر اکشن ۱۰ ثانیه فرصت وجود دارد.
      </div>
    </div>
  );
}