import React from "react";

export default function Header({ onHome, onRefresh, title = "مجموعه بازی‌ها — کودتا", totals }){
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-badge">ک</div>
        <div>
          <div style={{fontWeight:700}}>{title}</div>
          <div style={{fontSize:13,color:'#6b7280'}}>نسخهٔ پروتوتایپ</div>
        </div>
      </div>
      <div style={{display:'flex', gap:12, alignItems:'center'}}>
        {totals && (
          <div style={{textAlign:'right', fontSize:13, color:'#0f172a'}}>
            <div style={{fontWeight:700}}>امتیاز: {totals.score ?? 0}</div>
            <div style={{color:'#6b7280'}}>HP: {totals.hp ?? 0} • الماس: {totals.gems ?? 0}</div>
          </div>
        )}
        <div style={{display:'flex', gap:8}}>
          <button className="btn" onClick={onHome}>خانه</button>
          <button className="btn" onClick={onRefresh}>رفرش</button>
        </div>
      </div>
    </header>
  )
}