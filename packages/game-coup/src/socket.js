// packages/game-coup/src/socket.js
import { io } from "socket.io-client";

let socket = null;

/**
 * call connectSocket('http://192.168.1.10:3000') with laptop IP
 */
export function connectSocket(serverUrl) {
  if (socket && socket.connected) return socket;
  socket = io(serverUrl, { transports: ['websocket'] });
  socket.on('connect', () => {
    console.log('connected to socket server', socket.id);
  });
  socket.on('disconnect', () => {
    console.log('socket disconnected');
  });
  return socket;
}

export function getSocket() {
  return socket;
}
