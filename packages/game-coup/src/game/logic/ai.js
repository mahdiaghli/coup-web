import { aiChoiceWeight } from "../../utils/ai";

export function createAiHandlers(ctx) {
  const {
    stateRef,
    setGameState,
    pushLog,
    initiateClaim,
    initiateLoseInfluence,
    advanceTurn,
  } = ctx;

  function runTurn() {
    const s = stateRef.current;
    if (!s) return;
    if (s.winner != null) return;
    const cur = s.players[s.turn];
    if (!cur) return;
    if (!cur.alive) {
      advanceTurn(s);
      return;
    }
    if (cur.isHuman) return;

    setTimeout(() => {
      const now = stateRef.current;
      if (!now) return;
      const player = now.players[now.turn];
      if (!player || player.isHuman || !player.alive) return;
      const mustCoup = player.coins >= 10;
      if (mustCoup) {
        const targets = now.players.filter(
          (p) => p.alive && p.id !== player.id
        );
        if (targets.length === 0) {
          advanceTurn(now);
          return;
        }
        const t = targets[Math.floor(Math.random() * targets.length)];
        player.coins -= 7;
        now.treasury = (now.treasury || 0) + 7;
        pushLog(`${player.name} Coup زد به ${t.name}.`);
        initiateLoseInfluence(now, t.id, "Coup");
        setGameState({ ...now });
        return;
      }

      const canCoup = player.coins >= 7;
      const canAss =
        player.coins >= 3 &&
        now.players.some((p) => p.alive && p.id !== player.id);
      const weights = [3, 2, 3, 2, canAss ? 3 : 0, 1, canCoup ? 5 : 0];
      const pick = aiChoiceWeight(weights);

      if (pick === 0) {
        player.coins += 1;
        now.treasury = Math.max(0, (now.treasury || 0) - 1);
        pushLog(`${player.name} Income گرفت (+1).`);
        setGameState({ ...now });
        advanceTurn(now);
        return;
      }
      if (pick === 1) {
        pushLog(`${player.name} Foreign Aid انتخاب کرد.`);
        initiateClaim(now, player.id, "ForeignAid", null, null);
        return;
      }
      if (pick === 6) {
        const targets = now.players.filter(
          (p) => p.alive && p.id !== player.id
        );
        if (targets.length === 0) {
          advanceTurn(now);
          return;
        }
        const t = targets[Math.floor(Math.random() * targets.length)];
        player.coins -= 7;
        now.treasury = (now.treasury || 0) + 7;
        pushLog(`${player.name} Coup زد به ${t.name}.`);
        initiateLoseInfluence(now, t.id, "Coup");
        setGameState({ ...now });
        return;
      }
      if (pick === 2) {
        pushLog(`${player.name} اکشن Tax (ادعا: Duke) انتخاب کرد.`);
        initiateClaim(now, player.id, "Tax", "Duke", null);
        return;
      }
      if (pick === 3) {
        const targets = now.players.filter(
          (p) => p.alive && p.id !== player.id
        );
        if (targets.length === 0) {
          advanceTurn(now);
          return;
        }
        const t = targets[Math.floor(Math.random() * targets.length)];
        pushLog(
          `${player.name} اکشن Steal (ادعا: Captain) انتخاب کرد روی ${t.name}.`
        );
        initiateClaim(now, player.id, "Steal", "Captain", t.id);
        return;
      }
      if (pick === 4) {
        const targets = now.players.filter(
          (p) => p.alive && p.id !== player.id
        );
        if (targets.length === 0) {
          advanceTurn(now);
          return;
        }
        const t = targets[Math.floor(Math.random() * targets.length)];
        pushLog(
          `${player.name} اکشن Assassinate (ادعا: Assassin) انتخاب کرد روی ${t.name}.`
        );
        initiateClaim(now, player.id, "Assassinate", "Assassin", t.id);
        return;
      }
      if (pick === 5) {
        pushLog(`${player.name} اکشن Exchange (ادعا: Ambassador) انتخاب کرد.`);
        initiateClaim(now, player.id, "Exchange", "Ambassador", null);
        return;
      }
    }, 400 + Math.random() * 700);
  }

  return { runTurn };
}
