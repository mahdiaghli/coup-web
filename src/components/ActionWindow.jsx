import React from "react";
import { ROLE_LABELS } from "../utils/deck";

/**
 Props:
  - pendingAction  (object | null)
  - timerSeconds
  - onHumanChallenge()
  - onHumanBlock(role)
  - currentPlayerId
  - getPlayer(id)
*/
export default function ActionWindow({ pendingAction, timerSeconds, onHumanChallenge, onHumanBlock, currentPlayerId, getPlayer }) {
  if(!pendingAction) return (
    <div className="card">
      <div style={{fontWeight:700}}>فعلاً اکشنی در انتظار نیست</div>
    </div>
  );

  const claimant = getPlayer(pendingAction.claimantId) || { name: '—' };
  const roleLabel = pendingAction.claimedRole ? ROLE_LABELS[pendingAction.claimedRole] : "—";

  return (
    <div className="card">
      <div style={{fontWeight:700}}>درخواست: {claimant.name}</div>
      <div className="small" style={{marginTop:6}}>اکشن: <b>{pendingAction.actionName}</b> {pendingAction.claimedRole ? `(ادعا: ${roleLabel})` : ''}</div>
      <div style={{marginTop:10,fontSize:20,fontWeight:700}}>مرحله: {pendingAction.stage} — زمان: {timerSeconds}s</div>

      <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:8}}>
        {pendingAction.stage === 'challenge' && pendingAction.claimedRole && pendingAction.claimantId !== currentPlayerId && (
          <button className="btn" style={{background:'#fde68a'}} onClick={onHumanChallenge}>چلنج کن</button>
        )}

        {pendingAction.stage === 'block' && !pendingAction.blocker && (
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {pendingAction.actionName === 'ForeignAid' && (
              <div>می‌توانید Foreign Aid را با ادعای <b>دوک</b> بلوک کنید:
                <button style={{marginRight:10}} className="btn" onClick={()=>onHumanBlock('Duke')}>بلوک (دوک)</button>
              </div>
            )}
            {pendingAction.actionName === 'Steal' && pendingAction.targetId === currentPlayerId && (
              <div>می‌توانید Steal را با ادعای <b>کاپیتان</b> یا <b>سفیر</b> بلوک کنید:
                <div style={{marginTop:6}}>
                  <button className="btn" onClick={()=>onHumanBlock('Captain')}>بلوک (کاپیتان)</button>
                  <button className="btn" style={{marginLeft:8}} onClick={()=>onHumanBlock('Ambassador')}>بلوک (سفیر)</button>
                </div>
              </div>
            )}
            {pendingAction.actionName === 'Assassinate' && pendingAction.targetId === currentPlayerId && (
              <div>می‌توانید Assassinate را با ادعای <b>کنتسا</b> بلوک کنید:
                <button className="btn" style={{marginRight:10}} onClick={()=>onHumanBlock('Contessa')}>بلوک (کنتسا)</button>
              </div>
            )}
          </div>
        )}

        {pendingAction.blocker && (
          <div className="small">بلوکی توسط {getPlayer(pendingAction.blocker.id)?.name} اعلام شده — ادعا: {ROLE_LABELS[pendingAction.blocker.roleClaimed] || pendingAction.blocker.roleClaimed}</div>
        )}
      </div>
    </div>
  );
}