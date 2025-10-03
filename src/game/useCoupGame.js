import { useEffect, useRef, useState } from "react";
import { createActionHandlers } from "./logic/actions";
import { createClaimHandlers } from "./logic/claims";
import { createExchangeHandlers } from "./logic/exchange";
import { createLoseHandlers } from "./logic/lose";
import { createAiHandlers } from "./logic/ai";
import {
  drawOneFromState as drawOneHelper,
  checkWinner as checkWinnerHelper,
  advanceTurn as advanceTurnHelper,
} from "./logic/helpers";

export default function useCoupGame(difficulty) {
  const [gameState, _setGameState] = useState(null);
  const [log, setLog] = useState([]);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [reveal, setReveal] = useState(null);

  const pendingTimerRef = useRef(null);
  const scheduledTimeouts = useRef([]);
  const stateRef = useRef(null);

  function setGameState(next) {
    _setGameState(next);
    stateRef.current = next;
  }

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        clearInterval(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      scheduledTimeouts.current.forEach((t) => clearTimeout(t));
      scheduledTimeouts.current = [];
    };
  }, []);

  function pushLog(txt) {
    setLog((l) => [txt, ...l].slice(0, 200));
  }

  function getPlayer(id) {
    const s = stateRef.current || gameState;
    if (!s) return null;
    return s.players.find((p) => p.id === id);
  }

  function clearScheduled() {
    if (pendingTimerRef.current) {
      clearInterval(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    scheduledTimeouts.current.forEach((t) => clearTimeout(t));
    scheduledTimeouts.current = [];
    setTimerSeconds(0);
  }

  // helpers bound to this hook
  function drawOneFromState(state) {
    return drawOneHelper(state);
  }
  function checkWinner(state) {
    return checkWinnerHelper(state, pushLog, setGameState);
  }

  // *** تغییر مهم: قبل از حرکت به نوبت بعدی scheduled timers پاک می‌شوند ***
  function advanceTurn(state) {
    // پاک‌سازی هرگونه تایمر یا scheduled قبل از تغییر نوبت
    clearScheduled();
    return advanceTurnHelper(state, setGameState, checkWinner);
  }

  // context passed to logic modules
  const ctx = {
    difficulty,
    stateRef,
    setGameState,
    setTimerSeconds,
    pendingTimerRef,
    scheduledTimeouts,
    pushLog,
    clearScheduled,
    getPlayer,
    setReveal,
    drawOneFromState,
    checkWinner,
    advanceTurn,
  };

  // compose modules (order matters for cross-calls)
  const { initiateExchange, confirmExchangeSelection } =
    createExchangeHandlers(ctx);
  const { loseInfluence, initiateLoseInfluence, confirmLoseSelection } =
    createLoseHandlers(ctx);
  const { startBotGame, doRevealAndSwap, executeAction } = createActionHandlers(
    { ...ctx, initiateExchange, initiateLoseInfluence }
  );
  const claims = createClaimHandlers({
    ...ctx,
    executeAction,
    doRevealAndSwap,
    initiateLoseInfluence,
  });
  const {
    initiateClaim,
    resolveClaimChallenge,
    resolveBlockChallenge,
    humanChallenge,
    humanBlock,
    humanAcceptAction,
    botChallenge,
    botBlock,
    scheduleBotsChallenges,
    scheduleBotsForBlock,
  } = claims;
  // expose to ctx functions used across modules
  ctx.initiateExchange = initiateExchange;
  ctx.initiateLoseInfluence = initiateLoseInfluence;
  ctx.executeAction = executeAction;
  ctx.doRevealAndSwap = doRevealAndSwap;
  ctx.initiateClaim = initiateClaim;
  ctx.resolveClaimChallenge = resolveClaimChallenge;
  ctx.resolveBlockChallenge = resolveBlockChallenge;
  ctx.botChallenge = botChallenge;
  ctx.botBlock = botBlock;
  ctx.scheduleBotsChallenges = scheduleBotsChallenges;
  ctx.scheduleBotsForBlock = scheduleBotsForBlock;

  const { runTurn } = createAiHandlers({
    ...ctx,
    initiateClaim,
    initiateLoseInfluence,
  });

  useEffect(() => {
    const s = stateRef.current || gameState;
    if (!s) return;
    if (s.winner != null) return;
    const cur = s.players?.[s.turn];
    if (!cur) return;
    // اگر بازیکن فعلی زنده نیست (یا اینفلوئنس ندارد) نوبت را جلو ببر
    if (!cur.alive) {
      advanceTurn(s);
      return;
    }
    const noPending = !s.pendingAction && !s.pendingExchange && !s.pendingLose;
    if (!cur.isHuman && cur.alive && noPending) {
      runTurn();
    }
  }, [gameState, difficulty]);

  function humanDo(action, targetId = null) {
    const st = stateRef.current || gameState;
    if (!st) return;
    const state = { ...st };
    const player = state.players[0];
    if (!player || !player.isHuman) return;
    if (!player.alive) return pushLog("شما حذف شده‌اید.");
    if (state.turn !== player.id) return pushLog("الان نوبت شما نیست.");
    const mustCoup = player.coins >= 10;
    if (mustCoup && action !== "Coup")
      return pushLog("شما باید Coup انجام دهید زیرا ۱۰ یا بیشتر سکه دارید.");

    if (action === "Income") {
      const give = Math.min(state.treasury || 0, 1);
      player.coins += give;
      state.treasury = Math.max(0, (state.treasury || 0) - give);
      pushLog("شما Income گرفتید (+1).");
      setGameState(state);
      advanceTurn(state);
      return;
    }
    if (action === "ForeignAid") {
      pushLog("شما Foreign Aid انتخاب کردید. ممکن است کسی آن را بلوک کند.");
      initiateClaim(state, player.id, "ForeignAid", null, null);
      // setGameState(state);
      // advanceTurn(state);
      return;
    }
    if (action === "Coup") {
      if (player.coins < 7) return pushLog("پول کافی برای Coup ندارید.");
      const t = state.players.find((p) => p.id === targetId && p.alive);
      if (!t) return pushLog("یک هدف معتبر انتخاب کنید.");
      player.coins -= 7;
      state.treasury = (state.treasury || 0) + 7;
      pushLog(`شما به ${t.name} کوپ زدید.`);
      setGameState(state);
      initiateLoseInfluence(state, t.id, "Coup");
      // setGameState(state);
      // advanceTurn(state);
      return;
    }
    if (action === "Tax") {
      pushLog("شما اکشن Tax (ادعا: دوک) انتخاب کردید.");
      initiateClaim(state, player.id, "Tax", "Duke", null);
      // setGameState(state);
      // advanceTurn(state);
      return;
    }
    if (action === "Steal") {
      const t = state.players.find((p) => p.id === targetId && p.alive);
      if (!t) return pushLog("یک هدف معتبر انتخاب کنید.");
      pushLog(`شما اکشن Steal (ادعا: کاپیتان) انتخاب کردید روی ${t.name}.`);
      initiateClaim(state, player.id, "Steal", "Captain", t.id);
      // setGameState(state);
      // advanceTurn(state);
      return;
    }
    if (action === "Assassinate") {
      if (player.coins < 3) return pushLog("پول کافی برای Assassinate ندارید.");
      const t = state.players.find((p) => p.id === targetId && p.alive);
      if (!t) return pushLog("یک هدف معتبر انتخاب کنید.");
      pushLog(
        `شما اکشن Assassinate (ادعا: آدم‌کش) انتخاب کردید روی ${t.name}.`
      );
      initiateClaim(state, player.id, "Assassinate", "Assassin", t.id);
      // setGameState(state);
      // advanceTurn(state);
      return;
    }
    if (action === "Exchange") {
      pushLog("شما اکشن Exchange (ادعا: سفیر) انتخاب کردید.");
      initiateClaim(state, player.id, "Exchange", "Ambassador", null);
      // setGameState(state);
      // advanceTurn(state);
      return;
    }
  }

  return {
    gameState,
    setGameState,
    log,
    timerSeconds,
    reveal,
    onCloseReveal: () => setReveal(null),
    getPlayer,
    pushLog,
    startBotGame,
    humanDo,
    humanChallenge,
    humanBlock,
    humanAcceptAction,
    confirmExchangeSelection,
    confirmLoseSelection,
  };
}
