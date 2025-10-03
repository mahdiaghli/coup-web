import React from "react";

export default function Header({ onHome, onRefresh, title = "مجموعه بازی‌ها — کودتا" }){
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-badge">ک</div>
        <div>
          <div style={{fontWeight:700}}>{title}</div>
          <div style={{fontSize:13,color:'#6b7280'}}>نسخهٔ پروتوتایپ</div>
        </div>
      </div>
      <div style={{display:'flex', gap:8}}>
        <button className="btn" onClick={onHome}>خانه</button>
        <button className="btn" onClick={onRefresh}>رفرش</button>
      </div>
    </header>
  )
}