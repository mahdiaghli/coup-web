require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => res.send('Coup socket server is running'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"]
  }
});

// نگهداری وضعیت سادهٔ اتاق‌ها (در حافظه)
const rooms = new Map(); // roomId -> { players: Map(socketId -> {id, name}) }

io.on('connection', socket => {
  console.log('socket connected', socket.id);

  socket.on('join', ({ roomId, name }, cb) => {
    if (!roomId) return cb && cb({ ok: false, error: 'no-roomId' });

    socket.join(roomId);

    // ensure room exists
    if (!rooms.has(roomId)) rooms.set(roomId, { players: new Map() });
    rooms.get(roomId).players.set(socket.id, { id: socket.id, name: name || `Player-${socket.id.slice(0,4)}` });

    // broadcast updated players list to everyone in room
    const playersArray = Array.from(rooms.get(roomId).players.values());
    io.to(roomId).emit('room-players', playersArray);

    // system message
    io.to(roomId).emit('system', { msg: `${name || socket.id} joined ${roomId}` });

    if (cb) cb({ ok: true, players: playersArray });
  });

  socket.on('leave', ({ roomId }, cb) => {
    socket.leave(roomId);
    if (rooms.has(roomId)) {
      rooms.get(roomId).players.delete(socket.id);
      const playersArray = Array.from(rooms.get(roomId).players.values());
      io.to(roomId).emit('room-players', playersArray);
      io.to(roomId).emit('system', { msg: `${socket.id} left ${roomId}` });
      if (cb) cb({ ok: true });
      // cleanup empty room
      if (playersArray.length === 0) rooms.delete(roomId);
    } else if (cb) cb({ ok: false });
  });

  // play-action: broadcast to ALL in room (including sender)
  socket.on('play-action', ({ roomId, action }) => {
    if (!roomId) return;
    // optionally validate/transform action here
    io.to(roomId).emit('player-action', { from: socket.id, action });
  });

  socket.on('disconnect', () => {
    // remove from any rooms
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        const playersArray = Array.from(room.players.values());
        io.to(roomId).emit('room-players', playersArray);
        io.to(roomId).emit('system', { msg: `${socket.id} disconnected` });
        if (playersArray.length === 0) rooms.delete(roomId);
      }
    }
    console.log('disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket server listening on port ${PORT}`);
});
