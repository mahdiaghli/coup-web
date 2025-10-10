require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // dev only; در production origin را محدود کن

app.get('/', (req, res) => {
  res.send('Coup socket server is running');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true, // dev: اجازه از هر origin؛ production: لیست origin ها
    methods: ["GET", "POST"]
  }
});

// ساده‌ترین room logic
io.on('connection', socket => {
  console.log('socket connected', socket.id);

  socket.on('join', (roomId, cb) => {
    socket.join(roomId);
    console.log(`${socket.id} joined ${roomId}`);
    // اطلاع به همهٔ کاربران در روم
    io.to(roomId).emit('system', { msg: `${socket.id} joined ${roomId}` });
    if (cb) cb({ ok: true });
  });

  socket.on('leave', (roomId, cb) => {
    socket.leave(roomId);
    io.to(roomId).emit('system', { msg: `${socket.id} left ${roomId}` });
    if (cb) cb({ ok: true });
  });

  // دریافت اکشن از یک بازیکن و ارسال به بقیهٔ روم
  socket.on('play-action', ({ roomId, action }) => {
    socket.to(roomId).emit('player-action', { from: socket.id, action });
  });

  socket.on('disconnect', reason => {
    console.log('disconnected', socket.id, reason);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket server listening on port ${PORT}`);
});
