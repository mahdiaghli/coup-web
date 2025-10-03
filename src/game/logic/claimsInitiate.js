// createClaimsInitiate.js
export function createClaimsInitiate(ctx, interactions) {
  const {
    stateRef,
    setGameState,
    setTimerSeconds,
    pendingTimerRef,
    scheduledTimeouts,
    pushLog,
    clearScheduled,
    getPlayer,
    executeAction,
  } = ctx;

  const { scheduleBotsForBlock, scheduleBotsChallenges } = interactions;

  function initiateClaim(
    state,
    claimantId,
    actionName,
    claimedRole = null,
    targetId = null
  ) {
    clearScheduled();
    const fresh = { ...state };
    const isBlockable = ["ForeignAid", "Steal", "Assassinate"].includes(
      actionName
    );
    let stage;
    if (claimedRole) stage = "challenge";
    else if (isBlockable) stage = "block";
    else stage = "resolve";

    // If immediate resolve (no role and not blockable) -> execute and advance
    if (stage === "resolve") {
      const claimant = fresh.players.find((p) => p.id === claimantId);
      pushLog(`${claimant.name} اکشن ${actionName} را اجرا کرد.`);
      executeAction(fresh, claimant, actionName, targetId);
      return;
    }

    fresh.pendingAction = {
      claimantId,
      actionName,
      claimedRole,
      targetId,
      stage,
      challengers: [],
      blocker: null,
      expiresAt: Date.now() + 10000,
      resolved: false,
    };
    setGameState(fresh);
    setTimerSeconds(10);
    if (pendingTimerRef.current) clearInterval(pendingTimerRef.current);
    pendingTimerRef.current = setInterval(() => {
      const now = stateRef.current || fresh;
      if (!now || !now.pendingAction) return;
      const rem = Math.max(
        0,
        Math.ceil((now.pendingAction.expiresAt - Date.now()) / 1000)
      );
      setTimerSeconds(rem);
    }, 250);

    const auto1 = setTimeout(() => {
      const now = stateRef.current;
      if (!now || !now.pendingAction) return;
      const p = now.pendingAction;
      if (p.resolved) return;

      if (p.challengers.length === 0) {
        const isBlockableLocal = [
          "ForeignAid",
          "Steal",
          "Assassinate",
        ].includes(p.actionName);

        // if we were in challenge stage and the action is blockable -> go to block stage
        if (p.stage === "challenge" && isBlockableLocal) {
          p.stage = "block";
          p.expiresAt = Date.now() + 10000;
          now.pendingAction = p;
          setGameState({ ...now });
          setTimerSeconds(10);
          if (pendingTimerRef.current) clearInterval(pendingTimerRef.current);
          pendingTimerRef.current = setInterval(() => {
            const later = stateRef.current;
            if (!later || !later.pendingAction) return;
            const rem = Math.max(
              0,
              Math.ceil((later.pendingAction.expiresAt - Date.now()) / 1000)
            );
            setTimerSeconds(rem);
          }, 250);

          // notify bots to potentially block
          scheduleBotsForBlock(now);

          // if nobody blocks within 10s, execute the action
          const autoBlock = setTimeout(() => {
            const s2 = stateRef.current;
            if (!s2 || !s2.pendingAction) return;
            const pa = s2.pendingAction;
            if (pa.stage === "block" && !pa.blocker) {
              const claimant = getPlayer(pa.claimantId);
              pushLog("هیچ‌کس بلوک نکرد — اکشن اجرا می‌شود.");
              executeAction(s2, claimant, pa.actionName, pa.targetId);
              // پس از اجرای اکشن، state به‌روز را بگیر تا turn/تغییرات override نشود
              const latest = stateRef.current || s2;
              if (latest) {
                latest.pendingAction = null;
                setGameState({ ...latest });
              }
              clearScheduled();
            }
          }, 10000);
          scheduledTimeouts.current.push(autoBlock);
        } else if (p.stage === "block") {
          // block stage and no blockers -> execute action
          const claimant = getPlayer(p.claimantId);
          pushLog("هیچ‌کس بلوک نکرد — اکشن اجرا می‌شود.");
          executeAction(now, claimant, p.actionName, p.targetId);
          // پس از اجرای اکشن، از آخرین state استفاده کن
          const latest = stateRef.current || now;
          if (latest) {
            latest.pendingAction = null;
            setGameState({ ...latest });
          }
          clearScheduled();
        } // در src/game/logic/claimsInitiate.js — داخل setTimeout(auto1) بخش مربوط به:
        // else if (p.stage === "challenge" && !isBlockableLocal) { ... }

        if (p.stage === "challenge" && !isBlockableLocal) {
          const claimant = getPlayer(p.claimantId);
          pushLog("هیچ‌کس چلنج نکرد — اکشن اجرا می‌شود.");

          // اجرا کن — executeAction ممکنه pendingExchange یا pendingLose را ست کند
          executeAction(now, claimant, p.actionName, p.targetId);

          // بعد از اجرای اکشن، وضعیت واقعی را از stateRef.current بگیر (تا تغییرات executeAction را از دست ندهیم)
          const updated = stateRef.current || now;
          // اگر executeAction اکشنی گذاشته که نیازمند pendingAction نیست، بهتر است pendingAction حذف شود.
          // اما اگر executeAction خودش pendingExchange ست کرده، نباید آن را پاک کنیم.
          // بنابراین فقط زمانی pendingAction را حذف کن که pendingExchange وجود ندارد.
          if (updated && !updated.pendingExchange) {
            updated.pendingAction = null;
          }
          setGameState({ ...updated });
          clearScheduled();
        }
      }
    }, 10000);
    scheduledTimeouts.current.push(auto1);

    if (stage === "challenge") scheduleBotsChallenges(fresh);
  }

  return { initiateClaim };
}
