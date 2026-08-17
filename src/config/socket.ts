import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { LiveSessionModel } from '../models/LiveSession.js';
import { UserModel } from '../models/User.js';

// Gift definitions with point values
export const GIFT_CATALOG: Record<string, { emoji: string; label: string; points: number }> = {
  rose:        { emoji: '🌹', label: 'Rose',        points: 5 },
  book:        { emoji: '📚', label: 'Golden Book',  points: 15 },
  diamond:     { emoji: '💎', label: 'Diamond',      points: 50 },
  crown:       { emoji: '👑', label: 'Crown',        points: 100 },
  africa_star: { emoji: '⭐', label: 'Africa Star',  points: 200 },
  universe:    { emoji: '🌍', label: 'Universe',     points: 500 }
};

let io: SocketServer;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket: Socket) => {
    // ── Join a live room ──
    socket.on('join-room', (data: { roomId: string; userId?: string; username?: string; avatar?: string }) => {
      const { roomId, userId, username, avatar } = data;
      socket.join(roomId);
      (socket as any)._roomId = roomId;
      (socket as any)._userId = userId;
      (socket as any)._username = username;

      // Increment viewer count
      const session = LiveSessionModel.findById(roomId);
      if (session) {
        const newCount = (session.viewersCount || 0) + 1;
        LiveSessionModel.findByIdAndUpdate(roomId, { viewersCount: newCount });
        io.to(roomId).emit('viewer-count', { count: newCount });
        // Announce join
        io.to(roomId).emit('user-joined', { username: username || 'Reader', avatar: avatar || '/uploads/default-avatar.png' });
      }
    });

    // ── Chat message ──
    socket.on('chat-message', (data: { roomId: string; userId?: string; username: string; avatar: string; message: string }) => {
      io.to(data.roomId).emit('chat-message', {
        userId: data.userId || '',
        username: data.username,
        avatar: data.avatar,
        message: data.message,
        timestamp: new Date().toISOString()
      });
    });

    // ── Send heart ──
    socket.on('send-heart', (data: { roomId: string }) => {
      const session = LiveSessionModel.findById(data.roomId);
      if (session) {
        const newLikes = (session.likesCount || 0) + 1;
        LiveSessionModel.findByIdAndUpdate(data.roomId, { likesCount: newLikes });
        io.to(data.roomId).emit('heart-received', { likesCount: newLikes });
      }
    });

    // ── Send gift ──
    socket.on('send-gift', (data: { roomId: string; userId: string; username: string; avatar: string; giftType: string }) => {
      const gift = GIFT_CATALOG[data.giftType];
      if (!gift) return;

      const session = LiveSessionModel.findById(data.roomId);
      if (!session) return;

      // Record gift in session
      const gifts = session.gifts || [];
      gifts.push({
        userId: data.userId,
        username: data.username,
        giftType: data.giftType,
        points: gift.points,
        sentAt: new Date().toISOString()
      });
      const totalGiftPoints = (session.totalGiftPoints || 0) + gift.points;
      LiveSessionModel.findByIdAndUpdate(data.roomId, { gifts, totalGiftPoints });

      // Add points to host's user record
      const host = UserModel.findById(session.hostId);
      if (host) {
        const newGiftPoints = (host.giftPoints || 0) + gift.points;
        const newStreakPoints = (host.streakPoints || 0) + Math.floor(gift.points / 10);
        const newViralScore = newGiftPoints + newStreakPoints;
        UserModel.findByIdAndUpdate(session.hostId, {
          giftPoints: newGiftPoints,
          streakPoints: newStreakPoints,
          viralScore: newViralScore
        });
      }

      // Broadcast gift animation to entire room
      io.to(data.roomId).emit('gift-received', {
        username: data.username,
        avatar: data.avatar,
        giftType: data.giftType,
        emoji: gift.emoji,
        label: gift.label,
        points: gift.points,
        totalGiftPoints
      });
    });

    // ── WebRTC Signaling for Live Video & Audio Streaming ──
    socket.on('webrtc-offer', (data: { roomId: string; sdp: any; senderId: string; targetId?: string; role: string }) => {
      if (data.targetId) {
        io.to(data.targetId).emit('webrtc-offer', data);
      } else {
        socket.to(data.roomId).emit('webrtc-offer', data);
      }
    });

    socket.on('webrtc-answer', (data: { roomId: string; sdp: any; senderId: string; targetId?: string; role: string }) => {
      if (data.targetId) {
        io.to(data.targetId).emit('webrtc-answer', data);
      } else {
        socket.to(data.roomId).emit('webrtc-answer', data);
      }
    });

    socket.on('webrtc-ice', (data: { roomId: string; candidate: any; senderId: string; targetId?: string }) => {
      if (data.targetId) {
        io.to(data.targetId).emit('webrtc-ice', data);
      } else {
        socket.to(data.roomId).emit('webrtc-ice', data);
      }
    });

    // ── Co-host request by viewer ──
    socket.on('co-host-request', (data: { roomId: string; userId: string; username: string; avatar: string }) => {
      const session = LiveSessionModel.findById(data.roomId);
      if (!session) return;

      const requests = session.coHostRequests || [];
      if (!requests.includes(data.userId)) {
        requests.push(data.userId);
        LiveSessionModel.findByIdAndUpdate(data.roomId, { coHostRequests: requests });
      }

      // Send request notification to host
      io.to(data.roomId).emit('co-host-request', {
        userId: data.userId,
        username: data.username,
        avatar: data.avatar
      });
    });

    // ── Host invites viewer directly ──
    socket.on('co-host-invite', (data: { roomId: string; targetUserId: string; hostName: string }) => {
      io.to(data.roomId).emit('co-host-invite', data);
    });

    // ── Host accepts co-host ──
    socket.on('co-host-accept', (data: { roomId: string; userId: string; username: string }) => {
      const session = LiveSessionModel.findById(data.roomId);
      if (!session) return;

      const coHosts = session.coHosts || [];
      if (!coHosts.includes(data.userId)) {
        coHosts.push(data.userId);
      }
      // Remove from requests
      const requests = (session.coHostRequests || []).filter((id: string) => id !== data.userId);
      LiveSessionModel.findByIdAndUpdate(data.roomId, { coHosts, coHostRequests: requests });

      io.to(data.roomId).emit('co-host-accepted', {
        userId: data.userId,
        username: data.username
      });
    });

    // ── Host rejects co-host ──
    socket.on('co-host-reject', (data: { roomId: string; userId: string }) => {
      const session = LiveSessionModel.findById(data.roomId);
      if (!session) return;

      const requests = (session.coHostRequests || []).filter((id: string) => id !== data.userId);
      LiveSessionModel.findByIdAndUpdate(data.roomId, { coHostRequests: requests });

      io.to(data.roomId).emit('co-host-rejected', { userId: data.userId });
    });

    // ── Host drops / kicks co-host ──
    socket.on('co-host-drop', (data: { roomId: string; guestId: string; guestName?: string }) => {
      const session = LiveSessionModel.findById(data.roomId);
      if (session) {
        const coHosts = (session.coHosts || []).filter((id: string) => id !== data.guestId);
        LiveSessionModel.findByIdAndUpdate(data.roomId, { coHosts });
      }
      io.to(data.roomId).emit('co-host-dropped', { guestId: data.guestId, guestName: data.guestName });
    });

    // ── Guest leaves stage voluntarily ──
    socket.on('co-host-leave', (data: { roomId: string; guestId: string; guestName?: string }) => {
      const session = LiveSessionModel.findById(data.roomId);
      if (session) {
        const coHosts = (session.coHosts || []).filter((id: string) => id !== data.guestId);
        LiveSessionModel.findByIdAndUpdate(data.roomId, { coHosts });
      }
      io.to(data.roomId).emit('co-host-left', { guestId: data.guestId, guestName: data.guestName });
    });

    // ── End stream ──
    socket.on('end-stream', (data: { roomId: string }) => {
      io.to(data.roomId).emit('stream-ended', {});
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      const roomId = (socket as any)._roomId;
      if (roomId) {
        const session = LiveSessionModel.findById(roomId);
        if (session && session.viewersCount > 0) {
          const newCount = session.viewersCount - 1;
          LiveSessionModel.findByIdAndUpdate(roomId, { viewersCount: Math.max(0, newCount) });
          io.to(roomId).emit('viewer-count', { count: Math.max(0, newCount) });
        }
      }
    });
  });

  return io;
}

export function getIO(): SocketServer {
  return io;
}
