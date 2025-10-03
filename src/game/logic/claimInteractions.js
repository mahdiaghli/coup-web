// createClaimInteractions.js
export function createClaimInteractions(ctx) {
  const {
    stateRef,
    setGameState,
    setTimerSeconds,
    pendingTimerRef,
    scheduledTimeouts,
    pushLog,
    clearScheduled,
    difficulty,
    getPlayer,
    executeAction,
    doRevealAndSwap,
    initiateLoseInfluence,
    advanceTurn,
  } = ctx;

  function resolveClaimChallenge(state, challengerId) {
    const p = state.pendingAction;
    if (!p || p.stage !== "challenge") return;
    p.resolved = true;
    clearScheduled();
    const claimant = getPlayer(p.claimantId);
    const challenger = getPlayer(challengerId);
    const hasRole = p.claimedRole
      ? claimant.influences.includes(p.claimedRole)
      : false;

    if (hasRole) {
      // claimant had role => challenger loses one influence
      pushLog(
        `${claimant.name} واقعاً نقش «${p.claimedRole}» داشت — ${challenger.name} یک اینفلوانس از دست می‌دهد.`
      );
      initiateLoseInfluence(state, challenger.id);
      // claimant reveals & swaps
      doRevealAndSwap(state, claimant, p.claimedRole);

      // if action is blockable, go to block stage
      if (["ForeignAid", "Steal", "Assassinate"].includes(p.actionName)) {
        p.stage = "block";
        p.expiresAt = Date.now() + 10000;
        p.blocker = null;
        setGameState({ ...state });
        setTimerSeconds(10);
        if (pendingTimerRef.current) clearInterval(pendingTimerRef.current);
        pendingTimerRef.current = setInterval(() => {
          const st = stateRef.current;
          if (!st || !st.pendingAction) return;
          const rem = Math.max(
            0,
            Math.ceil((st.pendingAction.expiresAt - Date.now()) / 1000)
          );
          setTimerSeconds(rem);
        }, 250);

        // schedule bots for block
        if (typeof ctx.scheduleBotsForBlock === "function")
          ctx.scheduleBotsForBlock(state);

        // if nobody blocks, execute after 10s
        const autoBlock = setTimeout(() => {
          const now = stateRef.current;
          if (!now || !now.pendingAction) return;
          const pa = now.pendingAction;
          if (pa.stage === "block" && !pa.blocker) {
            const claimant2 = getPlayer(pa.claimantId);
            pushLog("هیچ‌کس بلوک نکرد — اکشن اجرا می‌شود.");
            executeAction(now, claimant2, pa.actionName, pa.targetId);
            const latest = stateRef.current || now;
            if (latest) {
              latest.pendingAction = null;
              setGameState({ ...latest });
            }
            clearScheduled();
          }
        }, 10000);
        scheduledTimeouts.current.push(autoBlock);
      } else {
        // not blockable -> execute immediately
        executeAction(
          state,
          claimant,
          p.actionName,
          p.targetId != null ? p.targetId : null
        );
        const latestAfter = stateRef.current || state;
        if (latestAfter) {
          latestAfter.pendingAction = null;
          setGameState({ ...latestAfter });
        }
        clearScheduled();
      }
    } else {
      // claimant did NOT have role -> claimant loses influence and action canceled
      pushLog(
        `${claimant.name} نقش «${
          p.claimedRole || "—"
        }» را نداشت — او یک اینفلوانس از دست داد؛ اکشن لغو شد.`
      );
      initiateLoseInfluence(state, claimant.id);
      state.pendingAction = null;
      setGameState({ ...state });
      clearScheduled();
    }
  }

  function resolveBlockChallenge(state, challengerId) {
    const p = state.pendingAction;
    if (!p || !p.blocker) return;
    const blocker = getPlayer(p.blocker.id);
    const challenger = getPlayer(challengerId);
    const role = p.blocker.roleClaimed;
    clearScheduled();
    const hasRole = blocker.influences.includes(role);

    if (hasRole) {
      // blocker had the claimed role -> challenger loses one influence; blocker reveals & swaps; action is cancelled
      pushLog(
        `${blocker.name} واقعاً نقش «${role}» داشت — ${challenger.name} یک اینفلوانس از دست می‌دهد.`
      );
      initiateLoseInfluence(state, challenger.id);
      doRevealAndSwap(state, blocker, role);
      pushLog(`بلوکی که ${blocker.name} انجام داد پابرجا ماند — اکشن لغو شد.`);
      state.pendingAction = null;
      setGameState({ ...state });
      // اکشن لغو شد و کسی برای ادامه کاری ندارد — نوبت بعدی
      advanceTurn(state);
    } else {
      // blocker lied -> blocker loses one influence, and action proceeds
      pushLog(
        `${blocker.name} نقش «${role}» را نداشت — او یک اینفلوانس از دست می‌دهد.`
      );
      // remove one from blocker
      if (blocker.influences.length > 0) {
        // remove first available (UI will show reveal)
        blocker.influences.splice(0, 1);
        pushLog(
          `${blocker.name} یک اینفلوانس را از دست داد (برای بلوک دروغین).`
        );
      }
      // special case: if action was Assassinate, the target still must lose influence (Assassinate effect)
      if (p.actionName === "Assassinate") {
        const still = getPlayer(blocker.id);
        // If blocker was target, then the assassin's target is the blocker; according to rules:
        // if blocker lied and did not have Contessa, assassin still succeeds -> target loses influence (extra)
        if (still && still.alive && still.influences.length > 0) {
          pushLog(
            `به خاطر انجامِ Assassinate، ${still.name} یک اینفلوانس دیگر از دست می‌دهد.`
          );
          still.influences.splice(0, 1);
          // check elimination
          setGameState({ ...state });
          return;
        }
      }

      const claimant = getPlayer(p.claimantId);
      pushLog(`به دلیل دروغ‌بودن بلوک، اکنون اکشن اجرا می‌شود.`);
      executeAction(
        state,
        claimant,
        p.actionName,
        p.targetId != null ? p.targetId : null
      );
      const latest2 = stateRef.current || state;
      if (latest2) {
        latest2.pendingAction = null;
        setGameState({ ...latest2 });
      }
    }
  }

  // Human initiates a challenge
  function humanChallenge() {
    const now = stateRef.current;
    if (!now || !now.pendingAction) return;
    const p = now.pendingAction;
    if (p.stage !== "challenge") return;
    const humanId = 0;
    const human = getPlayer(humanId);
    if (
      !human ||
      !human.alive ||
      (human.influences && human.influences.length === 0)
    ) {
      pushLog("شما دیگر نفوذی ندارید و نمی‌توانید چلنج کنید.");
      return;
    }
    if (p.claimantId === humanId) return;
    p.challengers.push(humanId);
    setGameState({ ...now });
    pushLog(`شما چلنج کردید ${getPlayer(p.claimantId).name} را.`);
    resolveClaimChallenge(now, humanId);
  }

  function botChallenge(botId) {
    const now = stateRef.current;
    if (!now || !now.pendingAction) return;
    const p = now.pendingAction;
    if (p.stage !== "challenge") return;
    p.challengers.push(botId);
    setGameState({ ...now });
    pushLog(
      `${getPlayer(botId).name} چلنج کرد ${getPlayer(p.claimantId).name} را.`
    );
    resolveClaimChallenge(now, botId);
  }

  function humanBlock(role) {
    const now = stateRef.current;
    if (!now || !now.pendingAction) return;
    const p = now.pendingAction;
    const humanId = 0;
    const human = getPlayer(humanId);
    if (
      !human ||
      !human.alive ||
      (human.influences && human.influences.length === 0)
    ) {
      pushLog("شما دیگر نفوذی ندارید و نمی‌توانید بلوک کنید.");
      return;
    }
    if (p.claimantId === humanId) {
      pushLog("نمی‌توانید خودتان را بلوک کنید.");
      return;
    }
    if (
      (p.actionName === "Steal" || p.actionName === "Assassinate") &&
      p.targetId !== humanId
    ) {
      pushLog("فقط هدف می‌تواند بلوک کند.");
      return;
    }
    if (p.stage !== "block" || p.blocker) return;

    p.blocker = {
      id: humanId,
      roleClaimed: role,
      challengers: [],
      expiresAt: Date.now() + 10000,
    };
    setGameState({ ...now });
    pushLog(`شما بلوک کردید (ادعا: ${role}).`);
    clearScheduled();
    setTimerSeconds(10);
    if (pendingTimerRef.current) clearInterval(pendingTimerRef.current);
    pendingTimerRef.current = setInterval(() => {
      const st = stateRef.current;
      if (!st || !st.pendingAction || !st.pendingAction.blocker) return;
      const rem = Math.max(
        0,
        Math.ceil((st.pendingAction.blocker.expiresAt - Date.now()) / 1000)
      );
      setTimerSeconds(rem);
    }, 250);

    // schedule bots to potentially challenge this block
    now.players.forEach((bot) => {
      if (!bot.alive || bot.id === humanId || bot.isHuman) return;
      const base =
        difficulty === "easy" ? 0.06 : difficulty === "medium" ? 0.15 : 0.33;
      const hasRole = bot.influences.includes(role);
      const prob = hasRole ? base * 0.3 : base * 1.2;
      const delay = 400 + Math.random() * 7600;
      const t = setTimeout(() => {
        const st = stateRef.current;
        if (!st || !st.pendingAction || !st.pendingAction.blocker) return;
        if (Math.random() < prob) {
          pushLog(`${bot.name} چلنج کرد بلوک شما را.`);
          resolveBlockChallenge(st, bot.id);
        }
      }, delay);
      scheduledTimeouts.current.push(t);
    });

    const autoChallenge = setTimeout(() => {
      const st = stateRef.current;
      if (!st || !st.pendingAction || !st.pendingAction.blocker) return;
      const b = st.pendingAction.blocker;
      if (b.challengers.length === 0) {
        pushLog("هیچ‌کس چلنج نکرد بلوک را — اکشن بلوک شد.");
        st.pendingAction = null;
        setGameState({ ...st });
        clearScheduled();
        // بلوک پابرجا ماند و کسی اینفلوانس از دست نداد — نوبت بعدی
        advanceTurn(st);
      }
    }, 10000);
    scheduledTimeouts.current.push(autoChallenge);
  }

  function botBlock(botId, roleClaim) {
    const now = stateRef.current;
    if (!now || !now.pendingAction) return;
    const p = now.pendingAction;
    if (p.stage !== "block" || p.blocker) return;
    p.blocker = {
      id: botId,
      roleClaimed: roleClaim,
      challengers: [],
      expiresAt: Date.now() + 10000,
    };
    setGameState({ ...now });
    pushLog(`${getPlayer(botId).name} بلوک کرد (ادعا: ${roleClaim}).`);
    clearScheduled();
    setTimerSeconds(10);
    if (pendingTimerRef.current) clearInterval(pendingTimerRef.current);
    pendingTimerRef.current = setInterval(() => {
      const st = stateRef.current;
      if (!st || !st.pendingAction || !st.pendingAction.blocker) return;
      const rem = Math.max(
        0,
        Math.ceil((st.pendingAction.blocker.expiresAt - Date.now()) / 1000)
      );
      setTimerSeconds(rem);
    }, 250);

    now.players.forEach((bot) => {
      if (!bot.alive || bot.id === botId || bot.isHuman) return;
      const base =
        difficulty === "easy" ? 0.06 : difficulty === "medium" ? 0.15 : 0.33;
      const hasRole = bot.influences.includes(roleClaim);
      const prob = hasRole ? base * 0.3 : base * 1.2;
      const delay = 400 + Math.random() * 7600;
      const t = setTimeout(() => {
        const st = stateRef.current;
        if (!st || !st.pendingAction || !st.pendingAction.blocker) return;
        if (Math.random() < prob) {
          pushLog(`${bot.name} چلنج کرد بلوک ${getPlayer(botId).name} را.`);
          resolveBlockChallenge(st, bot.id);
        }
      }, delay);
      scheduledTimeouts.current.push(t);
    });

    const autoChallenge = setTimeout(() => {
      const st = stateRef.current;
      if (!st || !st.pendingAction || !st.pendingAction.blocker) return;
      const b = st.pendingAction.blocker;
      if (b.challengers.length === 0) {
        pushLog("هیچ‌کس چلنج نکرد بلوک را — اکشن بلوک شد.");
        st.pendingAction = null;
        setGameState({ ...st });
        clearScheduled();
        // بلوک پابرجا ماند و کسی اینفلوانس از دست نداد — نوبت بعدی
        advanceTurn(st);
      }
    }, 10000);
    scheduledTimeouts.current.push(autoChallenge);
  }

  function humanAcceptAction() {
    const now = stateRef.current;
    if (!now || !now.pendingAction) return;
    const p = now.pendingAction;
    const humanId = 0;
    // only target can accept action
    if (p.targetId !== humanId) {
      pushLog("شما هدف این عملیات نیستید.");
      return;
    }
    const claimant = getPlayer(p.claimantId);
    pushLog("هدف «باشه» را زد — اکشن فوراً انجام می‌شود.");
    executeAction(now, claimant, p.actionName, p.targetId);
    now.pendingAction = null;
    setGameState({ ...now });
    clearScheduled();
    setTimerSeconds(0);
  }

  function scheduleBotsChallenges(state) {
    const p = state.pendingAction;
    if (!p) return;
    state.players.forEach((bot) => {
      if (!bot.alive || bot.id === p.claimantId || bot.isHuman) return;
      const base =
        difficulty === "easy" ? 0.06 : difficulty === "medium" ? 0.15 : 0.33;
      const hasRole = p.claimedRole
        ? bot.influences.includes(p.claimedRole)
        : false;
      const prob = hasRole ? base * 0.3 : base * 1.2;
      const delay = 400 + Math.random() * 7600;
      const t = setTimeout(() => {
        const now = stateRef.current;
        if (
          !now ||
          !now.pendingAction ||
          now.pendingAction.stage !== "challenge"
        )
          return;
        if (Math.random() < prob) {
          botChallenge(bot.id);
        }
      }, delay);
      scheduledTimeouts.current.push(t);
    });
  }

  function scheduleBotsForBlock(state) {
    const p = state.pendingAction;
    if (!p) return;
    state.players.forEach((bot) => {
      if (!bot.alive || bot.id === p.claimantId || bot.isHuman) return;
      let canBlock = false;
      let roles = [];
      if (p.actionName === "ForeignAid") {
        canBlock = true;
        roles = ["Duke"];
      }
      if (p.actionName === "Steal" && bot.id === p.targetId) {
        canBlock = true;
        roles = ["Captain", "Ambassador"];
      }
      if (p.actionName === "Assassinate" && bot.id === p.targetId) {
        canBlock = true;
        roles = ["Contessa"];
      }
      if (!canBlock) return;
      const base =
        difficulty === "easy" ? 0.05 : difficulty === "medium" ? 0.12 : 0.28;
      const hasAny = roles.some((r) => bot.influences.includes(r));
      const prob = hasAny ? base * 0.8 : base * 1.1;
      const delay = 400 + Math.random() * 7600;
      const t = setTimeout(() => {
        const now = stateRef.current;
        if (
          !now ||
          !now.pendingAction ||
          now.pendingAction.stage !== "block" ||
          now.pendingAction.blocker
        )
          return;
        if (Math.random() < prob) {
          const chosen = roles[Math.floor(Math.random() * roles.length)];
          botBlock(bot.id, chosen);
        }
      }, delay);
      scheduledTimeouts.current.push(t);
    });
  }

  return {
    resolveClaimChallenge,
    resolveBlockChallenge,
    humanChallenge,
    botChallenge,
    humanBlock,
    botBlock,
    humanAcceptAction,
    scheduleBotsChallenges,
    scheduleBotsForBlock,
  };
}
