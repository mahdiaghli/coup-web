import React from "react";
import { ROLE_IMAGES, ROLE_LABELS } from "../utils/deck";

export default function PlayerCard({ player, isYou }) {
  return (
    <div className="player-card">
      <div>
        <div style={{fontWeight:700}}>{player.name}</div>
        <div style={{fontSize:13,color:'#6b7280'}}>سکه: {player.coins} — اینفلوانس: {player.influences.length}</div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        {player.influences.map((c, idx) => (
          isYou ? (
            <div key={idx} style={{width:56,height:80,overflow:'hidden',borderRadius:8,boxShadow:'0 6px 18px rgba(2,6,23,0.06)'}}>
              <img src={ROLE_IMAGES[c]} alt={c} style={{width:'100%',height:'100%',objectFit:'cover'}} />
            </div>
          ) : (
            <div key={idx} style={{width:56,height:80,background:'#f1f5f9',borderRadius:6}} />
          )
        ))}
      </div>
    </div>
  );
}