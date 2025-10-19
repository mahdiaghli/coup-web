// src/App.jsx
import React, { useState } from "react";
import Header from "./components/Header";
import ModePage from "./pages/ModePage";
import SetupPage from "./pages/SetupPage";
import PlayPage from "./pages/PlayPage";
import FriendsModePage from "./pages/FriendsModePage";
import FriendsListPage from "./pages/FriendsListPage";
import CreateRoomSimple from "./pages/CreateRoomSimple";
import RoomLobbySimple from "./pages/RoomLobbySimple";

import useCoupGame from "./game/useCoupGame";
import { listRooms, subscribe as subscribeRooms, setRoomStarted, getRoomGame, initGameForRoom, leaveRoom } from './utils/roomManager';

// Components
import Lobby from './components/Lobby';


/**
  App.jsx — ریشهٔ اپ؛ فقط مدیریت صفحه‌ها و تنظیمات را نگه می‌دارد
*/

export default function App() {
  // create a lightweight identity for this client (me)
  // persistent base identity is stored in localStorage under 'gw_me'
  // but we append a per-tab session id (stored in sessionStorage) so each browser tab
  // becomes a separate player when joining rooms.
  const [me] = useState(() => {
    let base = null;
    try {
      const raw = localStorage.getItem('gw_me');
      if (raw) base = JSON.parse(raw);
    } catch (e) {}
    if (!base) {
      const baseId = `user-${Math.random().toString(36).slice(2,9)}`;
      base = { id: baseId, name: 'شما', isHuman: true };
      try { localStorage.setItem('gw_me', JSON.stringify(base)); } catch (e) {}
    }
    // per-tab id
    let tabId = null;
    try {
      tabId = sessionStorage.getItem('gw_tab_id');
      if (!tabId) {
        tabId = `t-${Math.random().toString(36).slice(2,9)}`;
        sessionStorage.setItem('gw_tab_id', tabId);
      }
    } catch (e) {
      // fallback to random if sessionStorage unavailable
      tabId = `t-${Math.random().toString(36).slice(2,9)}`;
    }
    const meObj = { ...base, id: `${base.id}::${tabId}` };
    return meObj;
  });
  const [page, setPage] = useState("mode");
  const [numPlayers, setNumPlayers] = useState(3);
  const [difficulty, setDifficulty] = useState("medium");

  const {
    gameState,
    setGameState,
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

  // watch rooms so if the room this client is a member of gets started (by any tab), we auto-enter play
  React.useEffect(() => {
    const unsub = subscribeRooms(() => {
      try {
        const rooms = listRooms();
        for (const r of rooms) {
          if (!r || !r.players) continue;
          const amInRoom = r.players.some(p => p.id === me.id);
          if (!amInRoom) continue;

          // if someone already marked started, enter play
          if (r.started) {
            // ensure shared game state exists and load it into local hook
            try {
              const existing = getRoomGame(r.id);
              const st = existing || initGameForRoom(r.id);
              if (st) {
                // setGameState is exposed by hook; call it if available
                if (typeof setGameState === 'function') setGameState(st);
              }
            } catch (e) {}
            if (typeof page === 'string' && page !== 'play') {
              setPage('play');
            }
            break;
          }

          // if room has reached capacity but not yet marked started, mark it started now
          try {
            if ((r.players.length || 0) >= (r.maxPlayers || 0)) {
              setRoomStarted(r.id, true);
              // next storage event will cause all tabs to enter play
            }
          } catch (e) {}
        }
      } catch (e) {}
    });
    return unsub;
  // re-subscribe whenever `me.id` or `page` changes to avoid stale closures
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id, page]);

  // helper: leave any rooms this client/tab is a member of
  function leaveMyRooms() {
    try {
      const rooms = listRooms();
      for (const r of rooms) {
        if (r.players && r.players.some(p => p.id === me.id)) {
          try { leaveRoom(r.id, me.id); } catch (e) {}
        }
      }
    } catch (e) {}
  }

  // ensure leaving rooms when user clicks Home in Header
  const handleHome = () => {
    leaveMyRooms();
    setPage('mode');
  };

  // leave rooms on unload (tab close)
  React.useEffect(() => {
    const fn = () => leaveMyRooms();
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, []);

  // detect navigation away from a room page and leave that room
  const prevPageRef = React.useRef(page);
  React.useEffect(() => {
    const prev = prevPageRef.current;
    if (prev && typeof prev === 'object' && prev.kind === 'room') {
      // if we navigated away from that room, leave it
      if (!page || (typeof page === 'string' && page !== 'play') || (typeof page === 'object' && page.id !== prev.id)) {
        try { leaveRoom(prev.id, me.id); } catch (e) {}
      }
    }
    prevPageRef.current = page;
  }, [page]);

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
          {page === "mode" && <ModePage onContinue={(target) => { if (target === 'friends') setPage('friends'); else setPage('setup') }} totals={totals} />}
          {page === "friends" && <FriendsModePage onBack={() => setPage('mode')} startBotGame={(n)=>{ startBotGame(n); setPage('play'); }} onNavigate={(path)=>{ if (path === '/friends/list') setPage('friends_list'); else if (path === '/friends/create') setPage('friends_create'); else console.warn('unknown friends path', path); }} />}
          {page === 'friends_list' && <FriendsListPage me={me} onBack={() => setPage('friends')} onJoin={(roomId)=> setPage({ kind: 'room', id: roomId })} />}
          {page === 'friends_create' && <CreateRoomSimple me={me} onBack={() => setPage('friends')} onCreated={(roomId)=> setPage({ kind: 'room', id: roomId })} />}
          {typeof page === 'object' && page?.kind === 'room' && <RoomLobbySimple roomId={page.id} me={me} onBack={() => setPage('friends')} onStart={(room)=>{ /* map room to startBotGame */ startBotGame(room.maxPlayers); setPage('play'); }} />}
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

              {/* if ranking exists (computed by the hook), show it; otherwise fall back to simple winner */}
              {gameState.ranking && Array.isArray(gameState.ranking) ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>رتبه‌بندی نهایی</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {gameState.ranking.map((r) => {
                      const p = gameState.players.find((x) => x.id === r.id) || {};
                      return (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 6, background: '#fafafa' }}>
                          <div>
                            <div style={{ fontWeight: 800 }}>{r.rank}. {r.name}</div>
                            <div style={{ color: '#6b7280', fontSize: 13 }}>
                              امتیاز بازی: {r.gameScore ?? 0} • {p.alive ? 'زنده' : 'حذف شده'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 13 }}>
                            {p.eliminatedAt ? new Date(p.eliminatedAt).toLocaleString() : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <div>
                    {getPlayer(gameState.winner)?.name || "—"} برنده شد.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  className="btn"
                  onClick={() => {
                    // rematch using same player count as previous game
                    try {
                      const n = (gameState.players && gameState.players.length) || 3;
                      startBotGame(n);
                      setPage('play');
                    } catch (e) {
                      setPage('mode');
                    }
                  }}
                >
                  بازی مجدد
                </button>

                <button className="btn" onClick={() => setPage("mode")}>
                  بازگشت به خانه
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
