// src/utils/roomManager.js
// simple rooms manager using localStorage and storage event for cross-tab sync
import { newDeck, shuffle as deckShuffle } from './deck';

const STORAGE_KEY = "coup_rooms_v1";

// Keep local subscribers so we can notify them immediately on writes (storage events
// only fire for other windows). This makes state updates visible to the writing tab.
const localListeners = new Set();

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { rooms: {} };
  } catch (e) {
    console.error("roomManager read error", e);
    return { rooms: {} };
  }
}
function writeStorage(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error("roomManager write error", e);
  }
}

function notifyLocalListeners() {
  try {
    const rooms = listRooms();
    localListeners.forEach((cb) => {
      try { cb(rooms); } catch (e) {}
    });
  } catch (e) {}
}
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

function nowISO() { return new Date().toISOString(); }

export function listRooms() {
  const s = readStorage();
  // return array sorted by createdAt desc
  return Object.values(s.rooms).sort((a,b) => (b.createdAt||"") - (a.createdAt||""));
}

export function getRoom(roomId) {
  const s = readStorage();
  return s.rooms?.[roomId] ?? null;
}

// game storage helpers (shared game state per room)
function gameKey(roomId) {
  return `coup_room_game_${roomId}`;
}

export function getRoomGame(roomId) {
  try {
    const raw = localStorage.getItem(gameKey(roomId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function setRoomGame(roomId, gameState) {
  try {
    localStorage.setItem(gameKey(roomId), JSON.stringify(gameState));
    notifyLocalListeners();
  } catch (e) {}
}

export function initGameForRoom(roomId) {
  const r = getRoom(roomId);
  if (!r) return null;
  // if already initialized, return it
  const existing = getRoomGame(roomId);
  if (existing) return existing;
  // build deck and deal two cards per player
  let deck = newDeck();
  deck = deckShuffle(deck);
  const players = (r.players || []).map((p) => {
    const c1 = deck.pop();
    const c2 = deck.pop();
    return {
      id: p.id,
      // if human and name is generic, derive a name from id so clients are identifiable
      name: (p.name && p.name !== 'شما') ? p.name : (String(p.id || '').split('::')[0] || p.name || 'بازیکن'),
      isHuman: !!p.isHuman,
      isBot: !!p.isBot,
      coins: p.coins ?? 2,
      alive: true,
      influences: [c1, c2],
      gameScore: 0,
    };
  });
  if (players.length === 2) players[0].coins = 1;
  const st = {
    deck,
    players,
    turn: 0,
    pendingAction: null,
    pendingExchange: null,
    pendingLose: null,
    winner: null,
    treasury: 50 - players.reduce((s, p) => s + (p.coins || 0), 0),
  };
  setRoomGame(roomId, st);
  return st;
}

/**
 createRoom({name, password, maxPlayers, botsCount, difficulty, host})
 host: {id, name, isHuman}
 returns room object
*/
export function createRoom({ name='روم جدید', password=null, maxPlayers=4, botsCount=0, difficulty='medium', host }) {
  const s = readStorage();
  const id = generateId();
  const room = {
    id,
    name,
    password: password || null,
    maxPlayers: Math.max(2, Math.min(6, Number(maxPlayers)||4)),
    botsCount: Number(botsCount)||0,
    difficulty: difficulty || 'medium',
    hostId: host?.id ?? null,
    players: [], // will include humans (host when they join)
    createdAt: nowISO(),
    started: false,
  };
  // add static bots now (they are just placeholders)
  for (let i=0;i<room.botsCount;i++){
    room.players.push({ id: `bot-${i+1}`, name: `ربات ${i+1}`, isHuman: false, isBot: true, coins: 2, influences: [], alive: true });
  }
  s.rooms = { ...s.rooms, [id]: room };
  writeStorage(s);
  // notify by triggering storage change via writeStorage; other tabs will see
  try { notifyLocalListeners(); } catch (e) {}
  return room;
}

export function removeRoom(roomId, callerId) {
  const s = readStorage();
  const r = s.rooms?.[roomId];
  if (!r) return { ok:false, err: 'روم پیدا نشد' };
  // only host can remove the room
  if (r.hostId && callerId !== r.hostId) return { ok:false, err: 'فقط میزبان می‌تواند روم را حذف کند' };
  delete s.rooms[roomId];
  writeStorage(s);
  try { notifyLocalListeners(); } catch (e) {}
  return { ok:true };
}

/**
 joinRoom(roomId, player, password)
 player: {id, name, isHuman}
 returns {ok, room, err}
*/
export function joinRoom(roomId, player, password=null) {
  const s = readStorage();
  const r = s.rooms?.[roomId];
  if (!r) return { ok:false, err: 'روم پیدا نشد' };
  if (r.password && r.password !== password) return { ok:false, err: 'رمز اشتباه است' };
  if (r.started) return { ok:false, err: 'بازی قبلاً شروع شده' };
  const currentCount = r.players.length;
  if (currentCount >= r.maxPlayers) return { ok:false, err: 'روم پر است' };
  // prevent duplicate join id
  if (r.players.some(p => p.id === player.id)) {
    return { ok:true, room: r };
  }

  // ensure a unique display name within the room
  let baseName = player.name || 'بازیکن';
  let name = baseName;
  let suffix = 1;
  while (r.players.some(p => p.name === name)) {
    suffix += 1;
    name = `${baseName} (${suffix})`;
  }

  const entry = { ...player, name, coins: 2, influences: [], alive: true };

  // Insert logic: host should be first; humans should be placed before bots to ensure order
  if (player.id === r.hostId) {
    r.players.splice(0, 0, entry);
  } else if (player.isHuman) {
    const firstBotIdx = r.players.findIndex(p => p.isBot);
    if (firstBotIdx === -1) r.players.push(entry);
    else r.players.splice(firstBotIdx, 0, entry);
  } else {
    // bots just append
    r.players.push(entry);
  }
  s.rooms = { ...s.rooms, [roomId]: r };
  writeStorage(s);
  try { notifyLocalListeners(); } catch (e) {}
  return { ok:true, room: r };
}

export function leaveRoom(roomId, playerId) {
  const s = readStorage();
  const r = s.rooms?.[roomId];
  if (!r) return;
  r.players = r.players.filter(p => p.id !== playerId);
  // if host left and room empty => delete room
  if (r.players.length === 0) {
    delete s.rooms[roomId];
  } else {
    // if host left, reassign host
    if (r.hostId === playerId) {
      r.hostId = r.players[0].id;
    }
    s.rooms[roomId] = r;
  }
  writeStorage(s);
  try { notifyLocalListeners(); } catch (e) {}
}

/**
 setRoomStarted(roomId, true|false)
*/
export function setRoomStarted(roomId, started=true) {
  const s = readStorage();
  const r = s.rooms?.[roomId];
  if (!r) return null;
  r.started = !!started;
  s.rooms[roomId] = r;
  writeStorage(s);
  try { notifyLocalListeners(); } catch (e) {}
  return r;
}

// subscribe to changes (callback will be called with listRooms())
// returns unsubscribe()
export function subscribe(callback) {
  const handler = (e) => {
    if (e.key && e.key !== STORAGE_KEY) return;
    try {
      const rooms = listRooms();
      callback(rooms);
    } catch (err) {
      console.error("roomManager subscribe error", err);
    }
  };
  window.addEventListener('storage', handler);
  // register in local listeners so the writing tab sees updates immediately
  localListeners.add(callback);
  // call immediately with current value
  callback(listRooms());
  return () => {
    window.removeEventListener('storage', handler);
    localListeners.delete(callback);
  };
}
