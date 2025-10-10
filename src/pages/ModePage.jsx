// src/pages/ModePage.jsx
import React from "react";

export default function ModePage({ onContinue, totals }) {
  return (
    <div className="card" style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{fontWeight:800,fontSize:18}}>انتخاب حالت بازی</div>

      {totals && (
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <div style={{fontWeight:700}}>امتیاز کل: {totals.score ?? 0}</div>
          <div style={{color:'#475569'}}>HP: {totals.hp ?? 0}</div>
          <div style={{color:'#f59e0b'}}>الماس‌ها: {totals.gems ?? 0}</div>
        </div>
      )}

      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:220}} className="card" >
          <div style={{fontWeight:700}}>بازی با ربات</div>
          <div style={{color:'#475569',marginTop:6}}>حالت سریع و آفلاین — ربات‌ها با سختی انتخابی شما بازی می‌کنند.</div>
          <div style={{marginTop:10}}>
            <button className="btn-primary btn" onClick={onContinue}>انتخاب این حالت</button>
          </div>
        </div>

        <div style={{flex:1,minWidth:220}} className="card" >
          <div style={{fontWeight:700}}>بازی با دوستان</div>
          <div style={{color:'#475569',marginTop:6}}>اتاق‌های محلی — ساخت یا پیوستن به روم‌ها (local-only).</div>
          <div style={{marginTop:10}}>
            <button className="btn-primary btn" onClick={() => onContinue('friends')}>ورود به بازی با دوستان</button>
          </div>
        </div>
      </div>
    </div>
  );
}