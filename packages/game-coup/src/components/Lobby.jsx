// packages/game-coup/src/components/Lobby.jsx
import React, { useState, useEffect } from 'react';
import { connectSocket, getSocket } from '../socket';

export default function Lobby() {
  const [roomId, setRoomId] = useState('');
  const [messages, setMessages] = useState([]);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    // اگر آدرس سرور را در localStorage یا env گذاشتی می‌تونی از آن استفاده کنی
    // مثال پیش‌فرض: replace with your laptop IP
    const ip = prompt("Enter server URL (e.g. http://192.168.1.10:3000):") || '';
    setServerUrl(ip);
    if (!ip) return;
    const s = connectSocket(ip);
    s.on('system', (data) => setMessages(m => [...m, { system: true, text: data.msg }]));
    s.on('player-action', (data) => setMessages(m => [...m, { text: JSON.stringify(data) }]));
    return () => {
      if (s) {
        s.off('system');
        s.off('player-action');
      }
    };
  }, []);

  function joinRoom() {
    const s = getSocket();
    if (!s) return alert('socket not connected');
    s.emit('join', roomId, (res) => {
      if (res && res.ok) setMessages(m => [...m, { system: true, text: `Joined ${roomId}` }]);
    });
  }

  function sendAction() {
    const s = getSocket();
    if (!s) return alert('socket not connected');
    const action = { type: 'test-move', payload: Math.random() };
    s.emit('play-action', { roomId, action });
    setMessages(m => [...m, { text: `You: ${JSON.stringify(action)}` }]);
  }

  return (
    <div style={{ padding: 20 }}>
      <h3>Lobby / Room</h3>
      <div>
        <input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="room id" />
        <button onClick={joinRoom}>Join</button>
        <button onClick={sendAction}>Send action</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <h4>Messages</h4>
        <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', padding: 8 }}>
          {messages.map((m, i) => <div key={i} style={{ color: m.system ? 'gray' : 'black' }}>{m.system ? `[system] ${m.text}` : m.text}</div>)}
        </div>
      </div>
    </div>
  );
}
