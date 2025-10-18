// packages/game-coup/src/components/Auth.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, getSocket } from '../socket';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const { saveAuth } = useAuth();
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('coup_server') || '');
  const [name, setName] = useState('');
  const [room, setRoom] = useState('room-1');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!serverUrl || !name || !room) return alert('Enter server URL, name and room id');
    setLoading(true);
    try {
      // connect socket
      const s = connectSocket(serverUrl);
      // ensure events before join
      await new Promise((resolve, reject) => {
        const to = setTimeout(() => {
          // fallback if connect not happen quickly
          if (!s.connected) {
            // still try join; socket.io queues emits
            console.warn('socket not connected yet, proceeding to emit join');
          }
          resolve();
        }, 200);
        if (s.connected) { clearTimeout(to); resolve(); }
      });

      s.emit('join', { roomId: room, name }, (res) => {
        setLoading(false);
        if (!res || !res.ok) {
          alert('Join failed: ' + JSON.stringify(res));
          return;
        }
        // save auth info
        saveAuth({ serverUrl, name, room });
        try { localStorage.setItem('coup_server', serverUrl); } catch(e) {}
        // goto mode page
        navigate('/mode');
      });

    } catch (err) {
      setLoading(false);
      alert('Connection error: ' + (err.message || err));
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Enter Game (Auth)</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 8 }}>
          <label>Server URL</label><br />
          <input value={serverUrl} onChange={e => setServerUrl(e.target.value)} placeholder="http://192.168.254.4:3000" style={{ width: 360 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Your name</label><br />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Alice" />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Room id</label><br />
          <input value={room} onChange={e => setRoom(e.target.value)} placeholder="room-1" />
        </div>
        <div>
          <button type="submit" disabled={loading}>{loading ? 'Joining...' : 'Enter Game'}</button>
        </div>
      </form>
    </div>
  );
}
