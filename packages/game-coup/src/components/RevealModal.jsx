import React from "react";
import { ROLE_IMAGES, ROLE_LABELS } from "../utils/deck";

export default function RevealModal({ reveal, onClose, getPlayer }) {
  // reveal = { playerId, role }
  if(!reveal) return null;
  const player = getPlayer(reveal.playerId) || { name: 'بازیکن' };
  return (
    <div className="reveal-modal">
      <div className="reveal-box">
        <div style={{color:'#6b7280',marginBottom:8}}>کارت نمایان شده</div>
        <img src={ROLE_IMAGES[reveal.role]} alt={reveal.role} style={{width:140,height:180,objectFit:'cover',borderRadius:8}} />
        <div style={{fontWeight:700,marginTop:12}}>{player.name} — {ROLE_LABELS[reveal.role]}</div>
        <div style={{marginTop:14}}>
          <button className="btn btn-primary" onClick={onClose}>باشه</button>
        </div>
      </div>
    </div>
  );
}