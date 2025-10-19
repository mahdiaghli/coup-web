// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json()); // برای parse کردن body در POST requests

// تست route برای اطمینان از کارکرد express
app.get('/test', (req, res) => {
  console.log('Test route hit!');
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/', (req, res) => {
  console.log('Root route hit!');
  res.send('Coup socket server is running');
});

// HTTP endpoint to get current rooms list (useful for quick testing from a phone browser)
app.get('/rooms', (req, res) => {
  const list = Array.from(rooms.values()).map(r => ({
    id: r.id, name: r.name, capacity: r.capacity, count: r.players.size, started: !!r.started
  }));
  res.json(list);
});

app.post('/create_room', (req, res) => {
  const { id, name, capacity } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'no-id' });
  if (rooms.has(id)) return res.status(400).json({ ok: false, error: 'exists' });
  rooms.set(id, { id, name: name || id, capacity: capacity || 2, players: new Map(), started: false });
  emitRoomsList();
  console.log('HTTP create_room ->', id);
  res.json({ ok: true });
});


const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ["GET","POST"] }
});

/**
 * rooms: Map<roomId, { id, name, capacity, players: Map(socketId -> {id, name}) , started: bool }>
 */
const rooms = new Map();

function emitRoomsList() {
  // lightweight list (no sensitive data)
  const list = Array.from(rooms.values()).map(r => ({
    id: r.id, name: r.name, capacity: r.capacity, count: r.players.size, started: !!r.started
  }));
  io.emit('rooms-list', list);
}

io.on('connection', socket => {
  console.log('socket connected', socket.id);

  // send current rooms list immediately
  socket.emit('rooms-list', Array.from(rooms.values()).map(r => ({
    id: r.id, name: r.name, capacity: r.capacity, count: r.players.size, started: !!r.started
  })));

  // create a new room (from laptop UI)
  socket.on('create_room', ({ id, name, capacity }, cb) => {
    if (!id) { cb && cb({ ok: false, error: 'no-id' }); return; }
    if (rooms.has(id)) { cb && cb({ ok: false, error: 'exists' }); return; }
    rooms.set(id, { id, name: name || id, capacity: (capacity || 2), players: new Map(), started: false });
    console.log('room created', id);
    emitRoomsList();
    cb && cb({ ok: true });
  });

  // list rooms (client can request explicitly, though we also emit updates)
  socket.on('list_rooms', (cb) => {
    const list = Array.from(rooms.values()).map(r => ({
      id: r.id, name: r.name, capacity: r.capacity, count: r.players.size, started: !!r.started
    }));
    cb && cb(list);
  });

  // join a room
  socket.on('join', ({ roomId, name } = {}, cb) => {
    const rId = roomId || 'default';
    if (!rooms.has(rId)) {
      // optionally create default room
      rooms.set(rId, { id: rId, name: rId, capacity: 2, players: new Map(), started: false });
    }
    const room = rooms.get(rId);

    // prevent joining a started room
    if (room.started) {
      cb && cb({ ok: false, error: 'already-started' });
      return;
    }

    // add player
    room.players.set(socket.id, { id: socket.id, name: name || `P-${socket.id.slice(0,4)}` });
    socket.join(rId);

    // notify room players about update
    const players = Array.from(room.players.values());
    io.to(rId).emit('room-players', players);
    io.to(rId).emit('system', { msg: `${name || socket.id} joined ${rId}` });
    emitRoomsList();

    // if reached capacity -> start game
    if (room.players.size >= room.capacity) {
      room.started = true;
      io.to(rId).emit('start-game', { roomId: rId });
      console.log('room started', rId);
      emitRoomsList();
    }

    cb && cb({ ok: true, players });
  });

  socket.on('leave', ({ roomId } = {}, cb) => {
    const rId = roomId || 'default';
    if (!rooms.has(rId)) { cb && cb({ ok: false }); return; }
    const room = rooms.get(rId);
    room.players.delete(socket.id);
    socket.leave(rId);
    const players = Array.from(room.players.values());
    io.to(rId).emit('room-players', players);
    io.to(rId).emit('system', { msg: `${socket.id} left ${rId}` });
    // reset started if needed
    if (room.started && players.length < room.capacity) room.started = false;
    if (players.length === 0) rooms.delete(rId);
    emitRoomsList();
    cb && cb({ ok: true });
  });

  socket.on('play-action', ({ roomId, action } = {}) => {
    const rId = roomId || 'default';
    io.to(rId).emit('player-action', { from: socket.id, action });
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    for (const [rId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        const players = Array.from(room.players.values());
        io.to(rId).emit('room-players', players);
        io.to(rId).emit('system', { msg: `${socket.id} disconnected` });
        if (room.started && players.length < room.capacity) room.started = false;
        if (players.length === 0) rooms.delete(rId);
      }
    }
    emitRoomsList();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket server listening on port ${PORT}`);
  console.log(`Test the server:`);
  console.log(`  Local: http://localhost:${PORT}/test`);
  console.log(`  Network: http://192.168.50.233:${PORT}/test`);
});
