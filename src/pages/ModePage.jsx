// src/pages/ModePage.jsx
import React from "react";

export default function ModePage({ onContinue }) {
  return (
    <div className="card" style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{fontWeight:800,fontSize:18}}>انتخاب حالت بازی</div>

      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:220}} className="card" >
          <div style={{fontWeight:700}}>بازی با ربات</div>
          <div style={{color:'#475569',marginTop:6}}>حالت سریع و آفلاین — ربات‌ها با سختی انتخابی شما بازی می‌کنند.</div>
          <div style={{marginTop:10}}>
            <button className="btn-primary btn" onClick={onContinue}>انتخاب این حالت</button>
          </div>
        </div>

        <div style={{flex:1,minWidth:220}} className="card" >
          <div style={{fontWeight:700}}>آنلاین (به‌زودی)</div>
          <div style={{color:'#475569',marginTop:6}}>بازی چندنفرهٔ آنلاین با لینک — در نسخه‌های بعدی فعال می‌شود.</div>
          <div style={{marginTop:10}}>
            <button className="btn btn-ghost" disabled>به‌زودی</button>
          </div>
        </div>
      </div>
    </div>
  );
}