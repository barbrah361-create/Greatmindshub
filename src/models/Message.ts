import { MessageDB } from '../config/db.js';

export interface Message {
  _id: string;
  id?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  content: string;
  status: 'pending' | 'accepted' | 'declined';
  isRead: boolean;
  createdAt: string;
}

export function generateConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

export const MessageModel = {
  create: (data: Partial<Message>): Message => {
    const _id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const message: Message = {
      _id,
      id: _id,
      conversationId: data.conversationId || generateConversationId(data.senderId!, data.receiverId!),
      senderId: data.senderId!,
      senderName: data.senderName || 'Anonymous',
      senderAvatar: data.senderAvatar || '/uploads/default-avatar.png',
      receiverId: data.receiverId!,
      receiverName: data.receiverName || 'Anonymous',
      receiverAvatar: data.receiverAvatar || '/uploads/default-avatar.png',
      content: data.content || '',
      status: data.status || 'accepted',
      isRead: data.isRead || false,
      createdAt: data.createdAt || new Date().toISOString()
    };
    MessageDB.create(message);
    return message;
  },

  findById: (id: string): Message | null => {
    return MessageDB.findById(id);
  },

  findByConversation: (conversationId: string): Message[] => {
    return MessageDB.find({ conversationId }).sort({ createdAt: 1 }).exec();
  },

  findUserConversations: (userId: string): { [conversationId: string]: Message[] } => {
    const all = MessageDB.find({}).exec();
    const userMessages = all.filter((m: Message) => m.senderId === userId || m.receiverId === userId);
    
    const conversations: { [conversationId: string]: Message[] } = {};
    for (const msg of userMessages) {
      if (!conversations[msg.conversationId]) {
        conversations[msg.conversationId] = [];
      }
      conversations[msg.conversationId].push(msg);
    }
    
    // Sort messages in each conversation chronologically
    for (const cId in conversations) {
      conversations[cId].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return conversations;
  },

  markConversationRead: (conversationId: string, currentUserId: string): void => {
    const messages = MessageDB.find({ conversationId }).exec();
    for (const msg of messages) {
      if (msg.receiverId === currentUserId && !msg.isRead) {
        MessageDB.findByIdAndUpdate(msg._id, { isRead: true });
      }
    }
  },

  acceptConversationRequests: (conversationId: string): void => {
    const messages = MessageDB.find({ conversationId }).exec();
    for (const msg of messages) {
      if (msg.status === 'pending') {
        MessageDB.findByIdAndUpdate(msg._id, { status: 'accepted' });
      }
    }
  },

  declineConversationRequests: (conversationId: string): void => {
    const messages = MessageDB.find({ conversationId }).exec();
    for (const msg of messages) {
      if (msg.status === 'pending') {
        MessageDB.findByIdAndUpdate(msg._id, { status: 'declined' });
      }
    }
  },

  getUnreadCount: (userId: string): number => {
    const all = MessageDB.find({ receiverId: userId, isRead: false, status: 'accepted' }).exec();
    return all.length;
  },

  getRequestCount: (userId: string): number => {
    const all = MessageDB.find({ receiverId: userId, status: 'pending' }).exec();
    return all.length;
  }
};
