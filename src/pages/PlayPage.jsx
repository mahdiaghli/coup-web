import React, { useState } from "react";
import PlayerCard from "../components/PlayerCard";
import ActionWindow from "../components/ActionWindow";
import RevealModal from "../components/RevealModal";

/**
 Props expected from App.jsx:
  - gameState, timerSeconds, pendingAction, pendingExchange, pendingLose
  - humanDo(action, targetId), humanChallenge(), humanBlock(role), confirmExchangeSelection(selected), confirmLoseSelection(role)
  - log, getPlayer(id)
  - reveal, onCloseReveal
*/
export default function PlayPage(props) {
  const {
    gameState,
    timerSeconds,
    pendingAction,
    pendingExchange,
    pendingLose,
    humanDo,
    humanChallenge,
    humanBlock,
    confirmExchangeSelection,
    confirmLoseSelection,
    log,
    getPlayer,
    reveal,
    onCloseReveal,
    totals,
    gameScore,
    me,
  } = props;

  // محافظت اولیه — اگر gameState تعریف نشده باشه نمایش loader
  if (!gameState || !gameState.players) {
    return (
      <div className="card">
        <div style={{ fontWeight: 700 }}>در حال آماده‌سازی بازی...</div>
        <div style={{ marginTop: 8, color: "#6b7280" }}>
          لطفاً چند لحظه صبر کنید...
        </div>
      </div>
    );
  }

  // identify local player by comparing ids (each tab has a unique me.id)
  const you = gameState.players.find(p => p.id === (me?.id)) || gameState.players[0];
  // ensure the player at index 0 is the 'you' for some internal logic (we'll not reorder state)
  const currentPlayer = gameState.players[gameState.turn];

  // helper برای تعیین اینکه آیا دکمه‌ها فعال باشن
  const isYourTurn =
    you && currentPlayer && you.id === currentPlayer.id && you.alive;
  const anyPending = !!(pendingAction || pendingExchange || pendingLose);

  // exchange offered (ممکنه null باشه)
  const offered = pendingExchange?.offered ?? null;

  // target selection state (برای Coup/Assassinate/Steal)
  const [selectedTarget, setSelectedTarget] = useState(null);
  const possibleTargets = gameState.players.filter(
    (p) => p.alive && p.id !== you.id
  );

  // determine whether current pendingAction allows this human to block
  function canHumanBlock() {
    if (!pendingAction) return false;
    const humanId = you.id;
    if (pendingAction.claimantId === humanId) return false; // نمی‌تواند خود را بلوک کند
    if (pendingAction.actionName === "ForeignAid") return true; // همه (غیر از claimant) می‌توانند با Duke بلوک کنند
    if (
      (pendingAction.actionName === "Steal" ||
        pendingAction.actionName === "Assassinate") &&
      pendingAction.targetId === humanId
    )
      return true;
    return false;
  }

  // helper: render target buttons
  function TargetsChooser() {
    if (!possibleTargets || possibleTargets.length === 0) {
      return <div style={{ color: "#6b7280" }}>هدف زنده‌ای موجود نیست.</div>;
    }
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {possibleTargets.map((t) => (
          <button
            key={t.id}
            className={selectedTarget === t.id ? "btn active" : "btn"}
            onClick={() => setSelectedTarget(t.id)}
            style={{ minWidth: 90 }}
          >
            {t.name} ({t.coins})
          </button>
        ))}
        <button
          className="btn"
          onClick={() => setSelectedTarget(null)}
          style={{ minWidth: 90 }}
        >
          لغو انتخاب
        </button>
      </div>
    );
  }

  // exchange checkbox state (local UI)
  // store indices instead of card names so duplicates can be selected independently
  const [exchangeSelection, setExchangeSelection] = useState([]); // indices into pendingExchange.newCards
  const [exchangeOldSelection, setExchangeOldSelection] = useState([]); // indices into you.influences

  function toggleExchangeChoiceIndex(idx) {
    setExchangeSelection((prev) => {
      if (prev.includes(idx)) return prev.filter((x) => x !== idx);
      return [...prev, idx];
    });
  }

  function toggleExchangeOldChoiceIndex(idx) {
    setExchangeOldSelection((prev) => {
      if (prev.includes(idx)) return prev.filter((x) => x !== idx);
      return [...prev, idx];
    });
  }

  // When pendingExchange changes, reset local selection
  React.useEffect(() => {
    setExchangeSelection([]);
    setExchangeOldSelection([]);
  }, [pendingExchange]);

  return (
    <div className="grid-3">
      {/* in-game score badge */}
      <div style={{position:'fixed', left:18, bottom:18, zIndex:60}}>
        <div className="card" style={{padding:10, minWidth:180}}>
          <div style={{fontWeight:700}}>امتیاز شما: {gameScore ?? 0}</div>
          {totals && (
            <div style={{marginTop:6,fontSize:13,color:'#6b7280'}}>
              امتیاز کل: {totals.score ?? 0} • HP: {totals.hp ?? 0} • الماس: {totals.gems ?? 0}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* بازیکنان */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 800 }}>بازیکنان</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              نوبت:{" "}
              <span style={{ fontWeight: 700 }}>
                {currentPlayer?.name ?? "—"}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 12 }} className="player-grid">
            {/* render players with visual ordering: show rightmost as index 0 (you) */}
            {(() => {
              // produce display order where you (if present) is rightmost
              const list = [...gameState.players];
              // find index of you in players
              const youIdx = list.findIndex(p => p.id === you.id);
              if (youIdx > 0) {
                // rotate so you is at position 0
                const rotated = list.slice(youIdx).concat(list.slice(0, youIdx));
                return rotated.map(p => <PlayerCard key={p.id} player={p} isYou={p.id === you.id} />);
              }
              return list.map(p => <PlayerCard key={p.id} player={p} isYou={p.id === you.id} />);
            })()}
          </div>
        </div>

        {/* کارت‌های شما */}
        <div className="card">
          <div style={{ fontWeight: 800 }}>کارت‌های شما</div>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            {you && you.influences && you.influences.length > 0 ? (
              you.influences.map((c, i) => (
                <div
                  key={i}
                  className="card-thumb"
                  style={{ width: 120, height: 170 }}
                >
                  <img
                    src={`/cards/${String(c).toLowerCase()}.png`}
                    alt={c}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ))
            ) : (
              <div style={{ color: "#6b7280" }}>
                هنوز کارت‌هایی برای نمایش وجود ندارد.
              </div>
            )}
          </div>
          <div style={{ color: "var(--muted)", marginTop: 8 }}>
            کارت‌های شما فقط برای شما نمایش داده می‌شوند.
          </div>
        </div>

        {/* اکشن‌ها */}
        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>عمل شما</div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              ابتدا یک هدف انتخاب کنید (برای Coup/Assassinate/Steal)، سپس اکشن
              را اجرا کنید.
            </div>
            <TargetsChooser />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              className="btn"
              onClick={() => humanDo("Income")}
              disabled={!isYourTurn || anyPending}
            >
              Income (+1)
            </button>
            <button
              className="btn"
              onClick={() => humanDo("ForeignAid")}
              disabled={!isYourTurn || anyPending}
            >
              Foreign Aid (+2)
            </button>
            <button
              className="btn"
              onClick={() => humanDo("Tax")}
              disabled={!isYourTurn || anyPending}
            >
              Tax (دوک)
            </button>

            <button
              className="btn"
              onClick={() => {
                if (!selectedTarget) {
                  alert("یک هدف انتخاب کنید.");
                  return;
                }
                humanDo("Steal", selectedTarget);
              }}
              disabled={!isYourTurn || anyPending}
            >
              Steal (کاپیتان)
            </button>

            <button
              className="btn"
              onClick={() => {
                if (!selectedTarget) {
                  alert("یک هدف انتخاب کنید.");
                  return;
                }
                humanDo("Assassinate", selectedTarget);
              }}
              disabled={!isYourTurn || anyPending}
            >
              Assassinate (آدم‌کش)
            </button>

            <button
              className="btn"
              onClick={() => humanDo("Exchange")}
              disabled={!isYourTurn || anyPending}
            >
              Exchange (سفیر)
            </button>

            <button
              className="btn"
              style={{ background: "var(--danger)", color: "#fff" }}
              onClick={() => {
                if (!selectedTarget) {
                  alert("یک هدف انتخاب کنید.");
                  return;
                }
                humanDo("Coup", selectedTarget);
              }}
              disabled={!isYourTurn || anyPending}
            >
              Coup (7)
            </button>
          </div>

          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
            نکته: وقتی نوبت شما نیست یا عملی در حال انجام است، دکمه‌ها غیرفعال
            هستند. پس از انتخاب یک اکشن، ۱۰ ثانیه برای چلنج وجود دارد.
          </div>
        </div>
      </div>

      {/* ستون راست: پنجره اکشن و لاگ */}
      <div className="side-panel">
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 800 }}>پنجرهٔ اکشن</div>
            <div className="timer-badge">{timerSeconds}s</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <ActionWindow
              pendingAction={pendingAction}
              timerSeconds={timerSeconds}
              onHumanChallenge={() => humanChallenge()}
              onHumanBlock={(role) => humanBlock(role)}
              currentPlayerId={you.id}
              getPlayer={getPlayer}
            />
          </div>

          {/* اگر pendingAction باشد نشان بده */}
          {pendingAction && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700 }}>درخواست جاری</div>
              <div style={{ color: "#6b7280", marginTop: 6 }}>
                ادعا:{" "}
                {pendingAction.claimedRole ? pendingAction.claimedRole : "—"} —
                اکشن: {pendingAction.actionName}
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                {/* چنانچه stage challenge است و شما میتوانید چلنج کنید */}
                {pendingAction.stage === "challenge" &&
                  pendingAction.claimantId !== you.id && (
                    <button
                      className="btn"
                      onClick={() => humanChallenge()}
                      disabled={!you.alive}
                    >
                      چلنج
                    </button>
                  )}

                {/* چنانچه stage block و شما مجاز به بلوک هستید (بر اساس canHumanBlock()) */}
                {pendingAction.stage === "block" &&
                  canHumanBlock() &&
                  !pendingAction.blocker && (
                    <div style={{ display: "flex", gap: 6 }}>
                      {pendingAction.actionName === "ForeignAid" && (
                        <button
                          className="btn"
                          onClick={() => humanBlock("Duke")}
                        >
                          بلوک با دوک
                        </button>
                      )}
                      {pendingAction.actionName === "Steal" && (
                        <>
                          <button
                            className="btn"
                            onClick={() => humanBlock("Captain")}
                          >
                            بلوک با کاپیتان
                          </button>
                          <button
                            className="btn"
                            onClick={() => humanBlock("Ambassador")}
                          >
                            بلوک با سفیر
                          </button>
                        </>
                      )}
                      {pendingAction.actionName === "Assassinate" && (
                        <button
                          className="btn"
                          onClick={() => humanBlock("Contessa")}
                        >
                          بلوک با کنتسا
                        </button>
                      )}
                    </div>
                  )}

                {/* نمایش اطلاعات بلوک اگر وجود دارد */}
                {pendingAction.blocker && (
                  <div style={{ marginTop: 8, color: "#6b7280" }}>
                    بلوکی توسط {getPlayer(pendingAction.blocker.id)?.name} —
                    ادعا: {pendingAction.blocker.roleClaimed}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontWeight: 800 }}>لاگ بازی</div>
          <div style={{ marginTop: 10, maxHeight: 300, overflow: "auto" }}>
            {log.map((l, i) => (
              <div key={i} className="log-item">
                {l}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 800 }}>راهنما</div>
          <div style={{ marginTop: 8, color: "var(--muted)" }}>
            قوانین: چلنج ۱۰s — سپس بلوک ۱۰s (در صورت قابل بلوک بودن). کاپیتان و
            سفیر برای Steal ممکن است بلوک کنند (هدف).
          </div>
        </div>
      </div>

      {/* مودال افشا */}
      {reveal && (
        <RevealModal
          reveal={reveal}
          onClose={onCloseReveal}
          getPlayer={getPlayer}
        />
      )}

      {/* مودال Exchange (انتخاب کارت‌های جدید و قدیمی) */}
      {pendingExchange && (
        <div className="reveal-overlay">
          <div className="reveal-box" style={{ maxWidth: "800px" }}>
            <div style={{ fontWeight: 800 }}>Exchange — انتخاب کارت</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
              از کارت‌های جدید و قدیمی خود، به تعداد کارت‌های فعلی‌تان (
              {pendingExchange.origCount ?? 2}) انتخاب کنید تا با هم عوض شوند.
            </div>

            {/* کارت‌های جدید */}
            <div style={{ marginTop: 16 }}>
              <div
                style={{ fontWeight: 600, marginBottom: 8, color: "#059669" }}
              >
                کارت‌های جدید ({exchangeSelection.length} انتخاب شده)
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {pendingExchange.newCards.map((card, idx) => {
                  const checked = exchangeSelection.includes(idx);
                  return (
                    <label
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <input
                        type="checkbox"
                        name="exchange-new"
                        value={`${card}__${idx}`}
                        checked={checked}
                        onChange={() => {
                          const maxAllowed = pendingExchange?.origCount ?? 2;
                          if (!checked && exchangeSelection.length >= maxAllowed) {
                            alert(`حداکثر ${maxAllowed} کارت جدید می‌توانید انتخاب کنید.`);
                            return;
                          }
                          toggleExchangeChoiceIndex(idx);
                        }}
                        style={{ width: 18, height: 18 }}
                      />
                      <div
                        style={{
                          width: 86,
                          height: 120,
                          overflow: "hidden",
                          borderRadius: 8,
                          boxShadow: "0 8px 24px rgba(2,6,23,0.06)",
                        }}
                      >
                        <img
                          src={`/cards/${String(card).toLowerCase()}.png`}
                          alt={card}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 13 }}>{card}</div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* کارت‌های قدیمی */}
            <div style={{ marginTop: 20 }}>
              <div
                style={{ fontWeight: 600, marginBottom: 8, color: "#dc2626" }}
              >
                کارت‌های فعلی شما ({exchangeOldSelection.length} انتخاب شده)
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {you?.influences?.map((card, idx) => {
                  const checked = exchangeOldSelection.includes(idx);
                  return (
                    <label
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <input
                        type="checkbox"
                        name="exchange-old"
                        value={`${card}__${idx}`}
                        checked={checked}
                        onChange={() => {
                          const maxAllowed = pendingExchange?.origCount ?? 2;
                          if (!checked && exchangeOldSelection.length >= maxAllowed) {
                            alert(`حداکثر ${maxAllowed} کارت قدیمی می‌توانید انتخاب کنید.`);
                            return;
                          }
                          toggleExchangeOldChoiceIndex(idx);
                        }}
                        style={{ width: 18, height: 18 }}
                      />
                      <div
                        style={{
                          width: 86,
                          height: 120,
                          overflow: "hidden",
                          borderRadius: 8,
                          boxShadow: "0 8px 24px rgba(2,6,23,0.06)",
                        }}
                      >
                        <img
                          src={`/cards/${String(card).toLowerCase()}.png`}
                          alt={card}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 13 }}>{card}</div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 20,
                justifyContent: "center",
              }}
            >
              <button
                className="btn"
                onClick={() => {
                  const maxAllowed = pendingExchange?.origCount ?? 2;
                  if (exchangeSelection.length > maxAllowed || exchangeOldSelection.length > maxAllowed) {
                    alert(`حداکثر ${maxAllowed} کارت از هر دسته انتخاب کنید.`);
                    return;
                  }
                  if (exchangeSelection.length !== exchangeOldSelection.length) {
                    alert(
                      `باید به همان تعداد کارت از هر دو دسته انتخاب کنید. (${exchangeSelection.length} جدید، ${exchangeOldSelection.length} قدیمی)`
                    );
                    return;
                  }
                  // convert index selections to actual card values
                  const selectedNewCards = (pendingExchange?.newCards || []).filter((_, i) => exchangeSelection.includes(i));
                  const selectedOldCards = exchangeOldSelection.length === 0 ? null : (you?.influences || []).filter((_, i) => exchangeOldSelection.includes(i));
                  confirmExchangeSelection(selectedNewCards, selectedOldCards);
                }}
              >
                تأیید
              </button>
              <button
                className="btn"
                onClick={() => {
                  // cancel means no-change: call confirmExchangeSelection with empty selection
                  confirmExchangeSelection([], null);
                }}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال pendingLose (وقتی یکی باید انتخاب کند کدام کارت از دست بدهد) */}
      {pendingLose && you && pendingLose.playerId === you.id && (
        <div className="reveal-overlay">
          <div className="reveal-box">
            <div style={{ fontWeight: 800 }}>انتخاب کارت برای از دست دادن</div>
            <div style={{ marginTop: 8 }}>
              لطفاً کارتی که می‌خواهید از دست بدهید انتخاب کنید:
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {you.influences.map((c, i) => (
                <button
                  key={i}
                  className="btn"
                  onClick={() => confirmLoseSelection(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
