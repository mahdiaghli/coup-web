// createActionHandlers.js
import { newDeck, shuffle as deckShuffle, makeBotName } from "../../utils/deck";

export function createActionHandlers(ctx) {
  const {
    setGameState,
    pushLog,
    drawOneFromState,
    initiateExchange,
    initiateLoseInfluence,
    advanceTurn,
    // gamification helpers (optional)
  addGameScore,
  addPersistentScore,
  addPersistentHP,
  resetGameScore,
  } = ctx;

  function startBotGame(numPlayers) {
    // reset per-game score when a new game starts
    try {
      if (typeof resetGameScore === "function") resetGameScore();
    } catch (e) {}
    // clear previous logs if helper available
    try {
      if (typeof resetLog === "function") resetLog();
    } catch (e) {}
    const deck = newDeck();
    const players = [];
    for (let i = 0; i < numPlayers; i++) {
      const isHuman = i === 0;
      players.push({
        id: i,
        name: isHuman ? "شما" : makeBotName(i),
        coins: 2,
        alive: true,
        // per-game score for ranking
        gameScore: 0,
        influences: [deck.pop(), deck.pop()],
        isHuman,
      });
    }
    if (numPlayers === 2) players[0].coins = 1;
    const st = {
      deck: deckShuffle(deck),
      players,
      turn: 0,
      pendingAction: null,
      pendingExchange: null,
      pendingLose: null,
      winner: null,
      treasury: 50 - players.reduce((s, p) => s + p.coins, 0),
    };
    setGameState(st);
    pushLog("بازی آغاز شد — حالت: بازی با ربات");
  }

  function doRevealAndSwap(state, claimant, roleToReveal) {
    pushLog(`${claimant.name} نقش «${roleToReveal}» را نشان داد و کارت را تعویض می‌کند.`);
    const idx = claimant.influences.indexOf(roleToReveal);
    if (idx !== -1) {
      claimant.influences.splice(idx, 1);
      state.deck.push(roleToReveal);
      state.deck = deckShuffle(state.deck);
      const newCard = drawOneFromState(state);
      claimant.influences.push(newCard);
    }
    setGameState({ ...state });
  }

  function executeAction(state, player, actionName, targetId) {
    const getP = (id) => state.players.find((p) => p.id === id);
    const target = targetId != null ? getP(targetId) : null;
    const requiresTarget = ["Steal", "Assassinate", "Coup"];
    if (requiresTarget.includes(actionName) && !target) {
      pushLog("هیچ هدف معتبری انتخاب نشده است.");
      return;
    }

    if (actionName === "Tax") {
      const give = Math.min(state.treasury || 0, 3);
      player.coins += give;
      state.treasury = Math.max(0, (state.treasury || 0) - give);
      pushLog(`${player.name} Tax گرفت (+${give}).`);
      setGameState({ ...state });
      // scoring: Tax (Duke) gives small points
      if (player.isHuman && typeof addGameScore === 'function') addGameScore(5);
  if (typeof player.gameScore === 'number') player.gameScore += 5;
      if (!player.isHuman && typeof addPersistentScore === 'function') addPersistentScore(2);
      advanceTurn(state);
      return;
    }

    if (actionName === "Steal") {
      const stolen = Math.min(2, target.coins);
      target.coins -= stolen;
      player.coins += stolen;
      pushLog(`${player.name} از ${target.name}، ${stolen} سکه دزدید.`);
      setGameState({ ...state });
      if (player.isHuman && typeof addGameScore === 'function') addGameScore(6);
  if (typeof player.gameScore === 'number') player.gameScore += 6;
      if (!player.isHuman && typeof addPersistentScore === 'function') addPersistentScore(3);
      advanceTurn(state);
      return;
    }

    if (actionName === "Assassinate") {
      if (player.coins < 3) {
        pushLog(`${player.name} پول کافی برای Assassinate ندارد.`);
        return;
      }
      player.coins -= 3;
      state.treasury = (state.treasury || 0) + 3;
      pushLog(`${player.name} Assassinate روی ${target.name} اجرا کرد (-3 سکه).`);
      setGameState({ ...state });
      if (player.isHuman && typeof addGameScore === 'function') addGameScore(10);
  if (typeof player.gameScore === 'number') player.gameScore += 10;
      if (!player.isHuman && typeof addPersistentScore === 'function') addPersistentScore(5);
      // initiate lose influence on target (target must choose a card)
      initiateLoseInfluence(state, target.id, "Assassinate");
      return;
    }

    if (actionName === "ForeignAid") {
      const give = Math.min(state.treasury || 0, 2);
      player.coins += give;
      state.treasury = Math.max(0, (state.treasury || 0) - give);
      pushLog(`${player.name} Foreign Aid گرفت (+${give}).`);
      setGameState({ ...state });
      if (player.isHuman && typeof addGameScore === 'function') addGameScore(2);
  if (typeof player.gameScore === 'number') player.gameScore += 2;
      if (!player.isHuman && typeof addPersistentScore === 'function') addPersistentScore(1);
      advanceTurn(state);
      return;
    }

    if (actionName === "Income") {
      const give = Math.min(state.treasury || 0, 1);
      player.coins += give;
      state.treasury = Math.max(0, (state.treasury || 0) - give);
      pushLog(`${player.name} Income گرفت (+${give}).`);
      setGameState({ ...state });
      if (player.isHuman && typeof addGameScore === 'function') addGameScore(1);
  if (typeof player.gameScore === 'number') player.gameScore += 1;
      if (!player.isHuman && typeof addPersistentScore === 'function') addPersistentScore(1);
      advanceTurn(state);
      return;
    }

    if (actionName === "Coup") {
      if (player.coins < 7) {
        pushLog(`${player.name} پول کافی برای Coup ندارد.`);
        return;
      }
      player.coins -= 7;
      state.treasury = (state.treasury || 0) + 7;
      pushLog(`${player.name} به ${target.name} Coup زد.`);
      setGameState({ ...state });
      if (player.isHuman && typeof addGameScore === 'function') addGameScore(15);
  if (typeof player.gameScore === 'number') player.gameScore += 15;
      if (!player.isHuman && typeof addPersistentScore === 'function') addPersistentScore(7);
      initiateLoseInfluence(state, target.id, "Coup");
      return;
    }

    // قبلی:
    // if (actionName === "Exchange") {
    //   initiateExchange(state, player.id);
    //   return;
    // }

    // جدید:
    if (actionName === "Exchange") {
      // پاک کردن pendingAction چون Exchange وارد حالت pendingExchange می‌شود
      state.pendingAction = null;
      // فراخوانی handlerِ Exchange که برای انسان pendingExchange را می‌سازد
      initiateExchange(state, player.id);
      // small reward for Exchange (looking for better cards)
      if (player.isHuman && typeof addGameScore === 'function') addGameScore(4);
      if (!player.isHuman && typeof addPersistentScore === 'function') addPersistentScore(2);
      return;
    }

  }

  return { startBotGame, doRevealAndSwap, executeAction };
}
