// packages/game-coup/src/components/ModePage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket, connectSocket } from '../socket';
import { useAuth } from '../context/AuthContext';

export default function ModePage() {
  const { auth, clearAuth } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // require auth
    if (!auth || !auth.serverUrl) {
      navigate('/', { replace: true });
      return;
    }

    // ensure socket connected (reconnect case)
    let s = getSocket();
    if (!s || !s.connected) {
      s = connectSocket(auth.serverUrl);
    }

    // register listeners
    s.on('system', (d) => setMessages(m => [...m, { system: true, text: d.msg }]));
    s.on('player-action', (d) => setMessages(m => [...m, { text: `player ${d.from}: ${JSON.stringify(d.action)}` }]));
    s.on('room-players', (pl) => setPlayers(pl));

    // if user refreshed after auth, re-join to ensure presence (server already had them maybe, but safe)
    s.emit('join', { roomId: auth.room, name: auth.name }, (res) => {
      if (!(res && res.ok)) {
        console.warn('re-join failed', res);
      }
    });

    return () => {
      if (s) {
        s.off('system');
        s.off('player-action');
        s.off('room-players');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.serverUrl]);

  function sendAction() {
    const s = getSocket();
    if (!s || !s.connected) return alert('Socket not connected');
    const action = { type: 'play-card', payload: Math.random() };
    s.emit('play-action', { roomId: auth.room, action });
    setMessages(m => [...m, { text: `You: ${JSON.stringify(action)}` }]);
  }

  function handleLeave() {
    const s = getSocket();
    if (s && s.connected) {
      s.emit('leave', { roomId: auth.room }, () => {});
    }
    clearAuth();
    navigate('/', { replace: true });
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Mode Page — Game</h2>
      <div>
        <div><strong>Player:</strong> {auth?.name}</div>
        <div><strong>Room:</strong> {auth?.room}</div>
        <div style={{ marginTop: 12 }}>
          <button onClick={sendAction}>Send action</button>
          <button onClick={handleLeave} style={{ marginLeft: 8 }}>Leave</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
        <div style={{ width: 200 }}>
          <h4>Players</h4>
          <ul>
            {players.map(p => <li key={p.id}>{p.name || p.id}</li>)}
          </ul>
        </div>

        <div style={{ flex: 1 }}>
          <h4>Messages</h4>
          <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #ddd', padding: 8 }}>
            {messages.map((m,i) => <div key={i} style={{ color: m.system ? 'gray' : 'black', marginBottom: 6 }}>{m.system ? `[system] ${m.text}` : m.text}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
