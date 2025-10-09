// src/pages/GamesPage.jsx
import React from "react";
import { ROLE_IMAGES } from "../utils/deck";

export default function GamesPage({ onPlay }) {
  return (
    <div className="grid-3" style={{gap:20}}>
      <div className="card hero-card">
        <div className="hero-img">
          <img src={ROLE_IMAGES.Duke} alt="کودتا" style={{width:'100%',height:'100%',objectFit:'cover'}} />
        </div>
        <div className="hero-text">
          <div style={{fontWeight:800,fontSize:20}}>کودتا — Coup</div>
          <div style={{color:'#475569',marginTop:8}}>یک بازی فریب و نقش‌آفرینی؛ هم‌اکنون می‌توانید با ربات بازی کنید. طراحی رنگی و مدرن برای تجربهٔ بهتر.</div>
          <div style={{marginTop:14,display:'flex',gap:10}}>
            <button className="btn-primary btn" onClick={onPlay}>شروع بازی</button>
            <button className="btn btn-ghost" onClick={()=>alert('راهنما: در این بازی هر بازیکن دو کارت دارد و می‌تواند ادعا کند...')}>راهنما</button>
          </div>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div className="card">
          <div style={{fontWeight:700,marginBottom:8}}>لیدربورد محلی</div>
          <div style={{color:'#475569'}}>امتیازات بازی‌های قبلی در localStorage ذخیره می‌شود. (نمایش نمونه)</div>
          <ol style={{marginTop:10,color:'#0f172a'}}>
            <li>1. شما — 120</li>
            <li>2. ربات 3 — 95</li>
            <li>3. ربات 2 — 80</li>
          </ol>
        </div>

        <div className="card">
          <div style={{fontWeight:700}}>تنظیمات سریع</div>
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <button className="btn">حالت تمرینی</button>
            <button className="btn">راهنمای قوانین</button>
          </div>
        </div>
      </div>
    </div>
  );
}