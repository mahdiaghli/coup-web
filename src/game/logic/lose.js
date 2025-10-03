// createLoseHandlers.js
export function createLoseHandlers(ctx) {
  const {
    setGameState,
    pushLog,
    setReveal,
    stateRef,
    pendingTimerRef,
    scheduledTimeouts,
    setTimerSeconds,
    clearScheduled,
    checkWinner,
    advanceTurn,
  } = ctx;

  function loseInfluence(state, player, role) {
    if (!player) return;
    const actualRole = role == null ? player.influences[0] : role;
    const idx = player.influences.indexOf(actualRole);
    if (idx !== -1) {
      player.influences.splice(idx, 1);
      pushLog(`${player.name} کارت «${actualRole}» را از دست داد.`);
      setReveal({ playerId: player.id, role: actualRole });
      setTimeout(() => setReveal(null), 1400);
      setGameState({ ...state });
      if (player.influences.length === 0) {
        player.alive = false;
        const coins = player.coins || 0;
        if (coins > 0) {
          state.treasury = (state.treasury || 0) + coins;
          player.coins = 0;
          pushLog(`${player.name} حذف شد و ${coins} سکه به خزانه بازگشت.`);
        } else {
          pushLog(`${player.name} حذف شد.`);
        }
        setGameState({ ...state });
        checkWinner(state);
        // if removed player had the turn, advance
        if (state.turn === player.id) advanceTurn(state);
        pushLog(`${player.id} حذف شد.`);
        // advanceTurn(state)
      }
    }
  }

  function initiateLoseInfluence(state, playerId, originAction = null) {
    const player = state.players.find((x) => x.id === playerId);
    if (!player || !player.alive || player.influences.length === 0) return;
    if (player.influences.length === 1) {
      // immediate lose
      loseInfluence(state, player, player.influences[0]);
      // if there is a pending action, cancel it and advance turn
      if (state.pendingAction) {
        state.pendingAction = null;
        setGameState({ ...state });
        advanceTurn(state);
      } else {
        // حتی اگر pendingAction نداریم (مثل Coup مستقیم)، باید نوبت جلو برود
        advanceTurn(state);
      }
      return;
    }

    if (player.isHuman) {
      state.pendingLose = {
        playerId,
        expiresAt: Date.now() + 20000,
        originAction,
      };
      setGameState({ ...state });
      setTimerSeconds(20);
      if (pendingTimerRef.current) clearInterval(pendingTimerRef.current);
      pendingTimerRef.current = setInterval(() => {
        const now = stateRef.current || state;
        if (!now || !now.pendingLose) return;
        const rem = Math.max(
          0,
          Math.ceil((now.pendingLose.expiresAt - Date.now()) / 1000)
        );
        setTimerSeconds(rem);
      }, 250);

      const auto = setTimeout(() => {
        const now = stateRef.current || state;
        if (!now || !now.pendingLose) return;
        const pid = now.pendingLose.playerId;
        const pl = now.players.find((p) => p.id === pid);
        if (!pl) return;
        const lost =
          pl.influences[Math.floor(Math.random() * pl.influences.length)];
        loseInfluence(now, pl, lost);
        now.pendingLose = null;
        setGameState({ ...now });
        clearScheduled();
        // if that pendingAction existed, cancel it and advance
        if (now.pendingAction) {
          now.pendingAction = null;
          setGameState({ ...now });
        }
        advanceTurn(now);
      }, 20000);
      scheduledTimeouts.current.push(auto);
    } else {
      const lost =
        player.influences[Math.floor(Math.random() * player.influences.length)];
      loseInfluence(state, player, lost);
      if (state.pendingAction) {
        state.pendingAction = null;
        setGameState({ ...state });
        advanceTurn(state);
      } else {
        // برای سناریوهایی مثل Coup که pendingAction ندارند
        advanceTurn(state);
      }
    }
  }

  function confirmLoseSelection(role) {
    const s = stateRef.current;
    if (!s || !s.pendingLose) return;
    const pid = s.pendingLose.playerId;
    const pl = s.players.find((p) => p.id === pid);
    if (!pl) return;
    loseInfluence(s, pl, role);
    s.pendingLose = null;
    setGameState({ ...s });
    clearScheduled();
    if (s.pendingAction) {
      s.pendingAction = null;
      setGameState({ ...s });
    }
    advanceTurn(s);
  }

  return { loseInfluence, initiateLoseInfluence, confirmLoseSelection };
}
