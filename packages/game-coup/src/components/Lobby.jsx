// packages/game-coup/src/components/Lobby.jsx
import React, { useState, useEffect } from 'react';
import { connectSocket, getSocket } from '../socket';

export default function Lobby() {
  const [serverUrl, setServerUrl] = useState(''); // user will enter
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      const s = getSocket();
      if (s && s.connected) s.disconnect();
    };
  }, []);

  function handleConnect() {
    if (!serverUrl) return alert('Enter server URL e.g. http://192.168.254.4:3000');
    try {
      const s = connectSocket(serverUrl);
      setConnected(true);
      s.on('system', (d) => setMessages(m => [...m, { system: true, text: d.msg }]));
      s.on('player-action', (d) => setMessages(m => [...m, { text: `action from ${d.from}: ${JSON.stringify(d.action)}` }]));
      s.on('room-players', (pl) => setPlayers(pl));
      s.on('connect', () => setMessages(m => [...m, { system: true, text: `connected ${s.id}` }]));
      s.on('disconnect', () => setConnected(false));
    } catch (e) {
      alert('connect error: ' + e.message);
    }
  }

  function joinRoom() {
    const s = getSocket();
    if (!s || !s.connected) return alert('Socket not connected. Click Connect first.');
    if (!roomId) return alert('Enter room id');
    s.emit('join', { roomId, name }, (res) => {
      if (res && res.ok) {
        setMessages(m => [...m, { system: true, text: `Joined ${roomId}` }]);
        // players will be updated by room-players event
      } else {
        alert('join failed: ' + JSON.stringify(res));
      }
    });
  }

  function leaveRoom() {
    const s = getSocket();
    if (!s || !s.connected) return;
    s.emit('leave', { roomId }, (res) => {
      if (res && res.ok) setMessages(m => [...m, { system: true, text: `Left ${roomId}` }]);
    });
  }

  function sendAction() {
    const s = getSocket();
    if (!s || !s.connected) return alert('Socket not connected.');
    const action = { type: 'card-play', payload: Math.random() }; // example action; replace with real game action
    s.emit('play-action', { roomId, action });
    setMessages(m => [...m, { text: `You: ${JSON.stringify(action)}` }]);
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Lobby / Room</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Server URL</label><br />
        <input value={serverUrl} onChange={e => setServerUrl(e.target.value)} placeholder="http://192.168.254.4:3000" style={{ width: 360 }} />
        <button onClick={handleConnect} disabled={connected} style={{ marginLeft: 8 }}>{connected ? 'Connected' : 'Connect'}</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Your name</label><br />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Alice" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Room id</label><br />
        <input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="room-1" />
        <button onClick={joinRoom} style={{ marginLeft: 8 }}>Join</button>
        <button onClick={leaveRoom} style={{ marginLeft: 8 }}>Leave</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <button onClick={sendAction}>Send example action</button>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <h4>Players</h4>
          <ul>
            {players.map(p => <li key={p.id}>{p.name || p.id}</li>)}
          </ul>
        </div>

        <div style={{ flex: 2 }}>
          <h4>Messages</h4>
          <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', padding: 8 }}>
            {messages.map((m, i) => <div key={i} style={{ color: m.system ? 'gray' : 'black', marginBottom: 6 }}>{m.system ? `[system] ${m.text}` : m.text}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
