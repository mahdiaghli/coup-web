import { shuffle as deckShuffle } from "../../utils/deck";

export function createExchangeHandlers(ctx) {
  const {
    stateRef,
    setGameState,
    setTimerSeconds,
    pendingTimerRef,
    scheduledTimeouts,
    pushLog,
    clearScheduled,
    drawOneFromState,
    advanceTurn,
  } = ctx;

  function initiateExchange(state, playerId) {
    clearScheduled();
    const s = { ...state };
    const p = s.players.find((x) => x.id === playerId);
    if (!p) return;
    const origCount = p.influences.length;
    const newCards = Array.from({ length: origCount }, () =>
      drawOneFromState(s)
    );

    if (!p.isHuman) {
      const pool = [...p.influences, ...newCards];
      pool.sort(() => Math.random() - 0.5);
      p.influences = pool.splice(
        Math.max(0, pool.length - origCount),
        origCount
      );
      s.deck = deckShuffle([...s.deck, ...pool]);
      pushLog(`${p.name} Exchange انجام داد.`);
      setGameState({ ...s });
      advanceTurn(s);
      return;
    }

    s.pendingExchange = {
      playerId,
      newCards,
      origCount,
      expiresAt: Date.now() + 20000,
    };
    setGameState({ ...s });
    setTimerSeconds(20);
    if (pendingTimerRef.current) clearInterval(pendingTimerRef.current);
    pendingTimerRef.current = setInterval(() => {
      const now = stateRef.current || s;
      if (!now || !now.pendingExchange) return;
      const rem = Math.max(
        0,
        Math.ceil((now.pendingExchange.expiresAt - Date.now()) / 1000)
      );
      setTimerSeconds(rem);
    }, 250);

    const auto = setTimeout(() => {
      const now = stateRef.current || s;
      if (!now || !now.pendingExchange) return;
      pushLog("زمان Exchange تمام شد — کارت‌ها تغییر نکردند.");
      now.deck = deckShuffle([...now.deck, ...now.pendingExchange.newCards]);
      now.pendingExchange = null;
      setGameState({ ...now });
      clearScheduled();
      advanceTurn(now);
    }, 20000);
    scheduledTimeouts.current.push(auto);
  }

  function confirmExchangeSelection(selectedNewCards, selectedOldCards = null) {
    const s = stateRef.current;
    if (!s || !s.pendingExchange) return;
    const pid = s.pendingExchange.playerId;
    const player = s.players.find((p) => p.id === pid);
    if (!player) return;

    const origCount = s.pendingExchange.origCount || player.influences.length;
    const maxPick = origCount;

    if (
      !Array.isArray(selectedNewCards) ||
      selectedNewCards.length < 1 ||
      selectedNewCards.length > maxPick
    ) {
      pushLog(`باید حداقل ۱ و حداکثر ${maxPick} کارت جدید انتخاب کنید.`);
      return;
    }

    // اگر کارت‌های قدیمی ارسال نشده‌اند، به صورت خودکار همان تعداد از کارت‌های فعلی بازیکن را انتخاب کن
    if (selectedOldCards == null) {
      selectedOldCards = player.influences.slice(0, selectedNewCards.length);
    } else {
      if (
        !Array.isArray(selectedOldCards) ||
        selectedOldCards.length !== selectedNewCards.length
      ) {
        pushLog(`باید به همان تعداد کارت از کارت‌های خود انتخاب کنید.`);
        return;
      }
    }

    // اعتبارسنجی کارت‌های جدید
    for (const c of selectedNewCards) {
      if (!s.pendingExchange.newCards.includes(c)) {
        pushLog("کارت جدید نامعتبر");
        return;
      }
    }
    // اعتبارسنجی کارت‌های قدیمی
    for (const c of selectedOldCards) {
      if (!player.influences.includes(c)) {
        pushLog("کارت قدیمی نامعتبر");
        return;
      }
    }

    // حذف کارت‌های قدیمی از بازیکن
    selectedOldCards.forEach((c) => {
      const i = player.influences.indexOf(c);
      if (i !== -1) player.influences.splice(i, 1);
    });

    // اضافه کردن کارت(های) جدید (تا حداکثرِ مجاز)
    player.influences.push(...selectedNewCards.slice(0, maxPick));

    const remainingNew = s.pendingExchange.newCards.filter(
      (c) => !selectedNewCards.includes(c)
    );
    s.deck = deckShuffle([...s.deck, ...remainingNew]);
    pushLog(`${player.name} Exchange را انجام داد.`);
    s.pendingExchange = null;
    setGameState({ ...s });
    clearScheduled();
    advanceTurn(s);
  }

  return { initiateExchange, confirmExchangeSelection };
}
