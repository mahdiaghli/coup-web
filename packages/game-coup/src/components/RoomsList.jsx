// packages/game-coup/src/components/RoomsList.jsx
import React, { useEffect, useState } from 'react';
import { getSocket, connectSocket, getDefaultServerUrl } from '../socket';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid'; // pnpm add uuid in package

export default function RoomsList() {
  const [rooms, setRooms] = useState([]);
  const { auth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const s = getSocket() || connectSocket(getDefaultServerUrl());

    // initial explicit request (optional)
    s.emit('list_rooms', (list) => {
      if (Array.isArray(list)) setRooms(list);
    });

    const onRooms = (list) => setRooms(list);
    const onStart = ({ roomId }) => {
      // if we are in that room, go to mode page
      if (auth?.room === roomId || true) { // if not tracking room in auth, we still navigate
        navigate('/mode');
      }
    };

    s.on('rooms-list', onRooms);
    s.on('start-game', onStart);

    return () => {
      s.off('rooms-list', onRooms);
      s.off('start-game', onStart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCreate() {
    const s = getSocket() || connectSocket(getDefaultServerUrl());
    const id = 'room-' + uuidv4().slice(0,6);
    const name = `Room ${id}`;
    const capacity = 2; // یا UI از کاربر بگیر
    s.emit('create_room', { id, name, capacity }, (res) => {
      if (res && res.ok) {
        // optionally auto-join
        s.emit('join', { roomId: id, name: auth?.name || 'Anon' }, () => {
          // store in auth if you want
          navigate('/mode');
        });
      } else {
        alert('create room failed: ' + JSON.stringify(res));
      }
    });
  }

  function handleJoin(r) {
    const s = getSocket() || connectSocket(getDefaultServerUrl());
    s.emit('join', { roomId: r.id, name: auth?.name || 'Anon' }, (res) => {
      if (res && res.ok) navigate('/mode');
      else alert('join failed: ' + JSON.stringify(res));
    });
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <button onClick={handleCreate}>Create new room</button>
      </div>

      <h4>Rooms</h4>
      <table>
        <thead><tr><th>id</th><th>name</th><th>players</th><th>capacity</th><th></th></tr></thead>
        <tbody>
          {rooms.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.name}</td>
              <td>{r.count}</td>
              <td>{r.capacity}</td>
              <td>
                {!r.started ? <button onClick={() => handleJoin(r)}>Join</button> : <span>Started</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
