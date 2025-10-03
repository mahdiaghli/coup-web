// src/App.jsx
import React, { useState } from "react";
import Header from "./components/Header";
import ModePage from "./pages/ModePage";
import SetupPage from "./pages/SetupPage";
import PlayPage from "./pages/PlayPage";

import useCoupGame from "./game/useCoupGame";

/**
  App.jsx — ریشهٔ اپ؛ فقط مدیریت صفحه‌ها و تنظیمات را نگه می‌دارد
*/

export default function App() {
  const [page, setPage] = useState("mode");
  const [numPlayers, setNumPlayers] = useState(3);
  const [difficulty, setDifficulty] = useState("medium");

  const {
    gameState,
    log,
    timerSeconds,
    reveal,
    onCloseReveal,
    getPlayer,
    pushLog,
    startBotGame,
    humanDo,
    humanChallenge,
    humanBlock,
    humanAcceptAction,
    confirmExchangeSelection,
    confirmLoseSelection,
    totals,
    gameScore,
  } = useCoupGame(difficulty);

  function handleStart() {
    startBotGame(numPlayers);
    setPage("play");
  }

  const playProps = {
    gameState,
    timerSeconds,
    pendingAction: gameState?.pendingAction ?? null,
    pendingExchange: gameState?.pendingExchange ?? null,
    pendingLose: gameState?.pendingLose ?? null,
    humanDo,
    humanChallenge,
    humanBlock,
    humanAcceptAction,
    confirmExchangeSelection,
    confirmLoseSelection,
    log,
    getPlayer,
    reveal,
    onCloseReveal,
    totals,
    gameScore,
  };

  return (
    <div style={{ padding: 20 }}>
      <div className="container">
        <Header
          onHome={() => setPage("mode")}
          onRefresh={() => pushLog("رفرش دستی انجام شد.")}
          totals={totals}
        />
        <main>
          {page === "mode" && <ModePage onContinue={() => setPage("setup")} totals={totals} />}
          {page === "setup" && (
            <SetupPage
              numPlayers={numPlayers}
              setNumPlayers={setNumPlayers}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              onStart={handleStart}
            />
          )}
          {page === "play" && gameState && gameState.winner == null && (
            <PlayPage {...playProps} />
          )}
          {page === "play" && gameState && gameState.winner != null && (
            <div className="card">
              <div style={{ fontWeight: 800, fontSize: 24 }}>بازی تمام شد!</div>
              <div style={{ marginTop: 10 }}>
                {getPlayer(gameState.winner)?.name || "—"} برنده شد.
              </div>
              <button className="btn" onClick={() => setPage("mode")}>
                بازگشت به خانه
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
