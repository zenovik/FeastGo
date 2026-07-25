import { Server } from 'socket.io';
import { resolveActor } from '../utils/resolveActor.js';

let io = null;

// One room per recipient (`notif:{role}:{userId}`) is all that's needed —
// broadcasts and per-user events both resolve to a list of recipients before
// they reach this module, so there's never a need for a separate "all
// sellers" room; we just emit to each recipient's own room.
export function notifRoom(role, userId) {
  return `notif:${role}:${userId.toString()}`;
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:4200',
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const { actor, role } = await resolveActor(token, { allowSuspended: true });
      socket.data.userId = actor._id.toString();
      socket.data.role = role;
      next();
    } catch {
      next(new Error('Not authenticated'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(notifRoom(socket.data.role, socket.data.userId));
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitToRecipient(role, userId, event, payload) {
  if (!io) return;
  io.to(notifRoom(role, userId)).emit(event, payload);
}
