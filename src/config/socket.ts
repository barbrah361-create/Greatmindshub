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

// In-memory active room participants registry
const activeRoomParticipants = new Map<string, Map<string, { socketId: string; userId: string; username: string; avatar: string; role: string }>>();

let io: SocketServer;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket: Socket) => {
    // ── Join a live room ──
    socket.on('join-room', (data: { roomId: string; userId?: string; username?: string; avatar?: string; isHost?: boolean }) => {
      const { roomId, userId, username, avatar, isHost } = data;
      socket.join(roomId);
      (socket as any)._roomId = roomId;
      (socket as any)._userId = userId;
      (socket as any)._username = username;

      // Track participant in room
      if (!activeRoomParticipants.has(roomId)) {
        activeRoomParticipants.set(roomId, new Map());
      }
      const roomMap = activeRoomParticipants.get(roomId)!;
      const participantKey = userId || socket.id;
      roomMap.set(participantKey, {
        socketId: socket.id,
        userId: userId || '',
        username: username || 'Reader',
        avatar: avatar || '/uploads/default-avatar.png',
        role: isHost ? 'host' : 'viewer'
      });

      // Increment viewer count
      const session = LiveSessionModel.findById(roomId);
      if (session) {
        const newCount = roomMap.size;
        LiveSessionModel.findByIdAndUpdate(roomId, { viewersCount: newCount });
        io.to(roomId).emit('viewer-count', { count: newCount });
        
        // Broadcast full real-time participants list to all clients in room
        const participantsList = Array.from(roomMap.values());
        io.to(roomId).emit('room-participants', { participants: participantsList });

        // Announce join
        io.to(roomId).emit('user-joined', { 
          userId: userId || '',
          username: username || 'Reader', 
          avatar: avatar || '/uploads/default-avatar.png' 
        });
      }
    });

    // ── Request participants list ──
    socket.on('get-participants', (data: { roomId: string }) => {
      const roomMap = activeRoomParticipants.get(data.roomId);
      if (roomMap) {
        socket.emit('room-participants', { participants: Array.from(roomMap.values()) });
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

    // ── Send heart / Like (Host cannot like own live; likes award points to host & co-hosts) ──
    socket.on('send-heart', (data: { roomId: string; senderId?: string }) => {
      const session = LiveSessionModel.findById(data.roomId);
      if (!session) return;

      // Host cannot like their own live session
      if (data.senderId && String(data.senderId) === String(session.hostId)) {
        return;
      }

      const newLikes = (session.likesCount || 0) + 1;
      LiveSessionModel.findByIdAndUpdate(data.roomId, { likesCount: newLikes });

      // Award points to host
      const host = UserModel.findById(session.hostId);
      if (host) {
        const hostStreak = (host.streakPoints || 0) + 1;
        const hostScore = (host.giftPoints || 0) + hostStreak;
        UserModel.findByIdAndUpdate(session.hostId, { streakPoints: hostStreak, viralScore: hostScore });
      }

      // Award points to active co-host guests on stage
      if (session.coHosts && session.coHosts.length > 0) {
        for (const guestId of session.coHosts) {
          const guestUser = UserModel.findById(guestId);
          if (guestUser) {
            const guestStreak = (guestUser.streakPoints || 0) + 1;
            const guestScore = (guestUser.giftPoints || 0) + guestStreak;
            UserModel.findByIdAndUpdate(guestId, { streakPoints: guestStreak, viralScore: guestScore });
          }
        }
      }

      io.to(data.roomId).emit('heart-received', { likesCount: newLikes });
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
      const userId = (socket as any)._userId;
      if (roomId && activeRoomParticipants.has(roomId)) {
        const roomMap = activeRoomParticipants.get(roomId)!;
        const participantKey = userId || socket.id;
        roomMap.delete(participantKey);

        const newCount = roomMap.size;
        LiveSessionModel.findByIdAndUpdate(roomId, { viewersCount: newCount });
        io.to(roomId).emit('viewer-count', { count: newCount });
        io.to(roomId).emit('room-participants', { participants: Array.from(roomMap.values()) });
      }
    });
  });

  return io;
}

export function getIO(): SocketServer {
  return io;
}
