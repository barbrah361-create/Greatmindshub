import { Request, Response } from 'express';
import { UserModel } from '../models/User.js';
import { MessageModel, generateConversationId, Message } from '../models/Message.js';
import { NotificationModel } from '../models/Notification.js';

export const MessageController = {
  // 1. Inbox Page (Primary & Requests)
  getInbox: async (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    const tab = (req.query.tab as string) || 'primary';
    const rawConversations = MessageModel.findUserConversations(user._id);

    const allUsers = UserModel.find().exec();
    const userMap = new Map(allUsers.map((u: any) => [String(u._id), u]));

    const conversationList: any[] = [];

    for (const [cId, messages] of Object.entries(rawConversations)) {
      if (messages.length === 0) continue;

      const lastMsg = messages[messages.length - 1];
      const otherUserId = lastMsg.senderId === user._id ? lastMsg.receiverId : lastMsg.senderId;
      const otherUser = userMap.get(String(otherUserId));

      const unreadCount = messages.filter((m: Message) => m.receiverId === user._id && !m.isRead).length;
      
      // Determine if this conversation is a pending request for current user
      const isPendingRequest = messages.some((m: Message) => m.receiverId === user._id && m.status === 'pending');
      const isDeclined = messages.every((m: Message) => m.status === 'declined');

      if (isDeclined) continue;

      const isBlocked = (user.blockedUsers || []).includes(otherUserId);

      conversationList.push({
        conversationId: cId,
        otherUser: otherUser ? {
          _id: otherUser._id,
          username: otherUser.username,
          avatar: otherUser.avatar || '/uploads/default-avatar.png',
          bio: otherUser.bio || '',
          verified: otherUser.verified || false
        } : {
          _id: otherUserId,
          username: lastMsg.senderId === user._id ? lastMsg.receiverName : lastMsg.senderName,
          avatar: lastMsg.senderId === user._id ? lastMsg.receiverAvatar : lastMsg.senderAvatar,
          bio: '',
          verified: false
        },
        lastMessage: lastMsg.content,
        lastMessageAt: lastMsg.createdAt,
        unreadCount,
        isPendingRequest,
        isBlocked
      });
    }

    // Sort by latest message date
    conversationList.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    const primaryConversations = conversationList.filter(c => !c.isPendingRequest);
    const requestConversations = conversationList.filter(c => c.isPendingRequest);

    const blockedUserIds = user.blockedUsers || [];
    const blockedUsers = blockedUserIds.map((id: string) => userMap.get(id)).filter(Boolean);

    res.render('messages', {
      title: 'Direct Messages & Inbox',
      user,
      tab,
      activeConversation: null,
      activeOtherUser: null,
      messages: [],
      primaryConversations,
      requestConversations,
      blockedUsers,
      requestCount: requestConversations.length,
      currentPrivacy: user.messagePrivacy || 'everyone'
    });
  },

  // 2. Conversation Thread Page
  getConversation: async (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    const { userId: otherUserId } = req.params;
    if (otherUserId === user._id) {
      return res.redirect('/messages');
    }

    const otherUser = UserModel.findById(otherUserId);
    if (!otherUser) {
      req.flash('error', 'User not found.');
      return res.redirect('/messages');
    }

    const cId = generateConversationId(user._id, otherUserId);
    MessageModel.markConversationRead(cId, user._id);
    const messages = MessageModel.findByConversation(cId);

    const isPendingRequest = messages.some((m: Message) => m.receiverId === user._id && m.status === 'pending');
    const isSenderBlocked = (otherUser.blockedUsers || []).includes(user._id);
    const isTargetBlockedByMe = (user.blockedUsers || []).includes(otherUserId);

    // Build sidebar conversations
    const rawConversations = MessageModel.findUserConversations(user._id);
    const allUsers = UserModel.find().exec();
    const userMap = new Map(allUsers.map((u: any) => [String(u._id), u]));

    const conversationList: any[] = [];
    for (const [convId, msgList] of Object.entries(rawConversations)) {
      if (msgList.length === 0) continue;
      const lastMsg = msgList[msgList.length - 1];
      const partnerId = lastMsg.senderId === user._id ? lastMsg.receiverId : lastMsg.senderId;
      const partner = userMap.get(String(partnerId));
      const unreadCount = msgList.filter((m: Message) => m.receiverId === user._id && !m.isRead).length;
      const isReq = msgList.some((m: Message) => m.receiverId === user._id && m.status === 'pending');

      conversationList.push({
        conversationId: convId,
        otherUser: partner || {
          _id: partnerId,
          username: lastMsg.senderId === user._id ? lastMsg.receiverName : lastMsg.senderName,
          avatar: lastMsg.senderId === user._id ? lastMsg.receiverAvatar : lastMsg.senderAvatar
        },
        lastMessage: lastMsg.content,
        lastMessageAt: lastMsg.createdAt,
        unreadCount,
        isPendingRequest: isReq,
        isBlocked: (user.blockedUsers || []).includes(partnerId)
      });
    }

    conversationList.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    const primaryConversations = conversationList.filter(c => !c.isPendingRequest);
    const requestConversations = conversationList.filter(c => c.isPendingRequest);
    const blockedUserIds = user.blockedUsers || [];
    const blockedUsers = blockedUserIds.map((id: string) => userMap.get(id)).filter(Boolean);

    res.render('messages', {
      title: `Chat with ${otherUser.username}`,
      user,
      tab: isPendingRequest ? 'requests' : 'primary',
      activeConversation: cId,
      activeOtherUser: {
        _id: otherUser._id,
        username: otherUser.username,
        avatar: otherUser.avatar || '/uploads/default-avatar.png',
        bio: otherUser.bio || '',
        verified: otherUser.verified || false,
        isBlocked: isTargetBlockedByMe,
        isSenderBlocked,
        messagePrivacy: otherUser.messagePrivacy || 'everyone'
      },
      messages,
      isPendingRequest,
      primaryConversations,
      requestConversations,
      blockedUsers,
      requestCount: requestConversations.length,
      currentPrivacy: user.messagePrivacy || 'everyone'
    });
  },

  // 3. Send Message
  sendMessage: async (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) {
      if (req.headers.accept?.includes('json')) return res.status(401).json({ error: 'Please sign in' });
      return res.redirect('/auth/login');
    }

    const { userId: receiverId } = req.params;
    const content = (req.body.content || '').trim();

    if (!content) {
      if (req.headers.accept?.includes('json')) return res.status(400).json({ error: 'Message content is required' });
      return res.redirect(`/messages/${receiverId}`);
    }

    const receiver = UserModel.findById(receiverId);
    if (!receiver) {
      if (req.headers.accept?.includes('json')) return res.status(404).json({ error: 'Recipient not found' });
      return res.redirect('/messages');
    }

    // Check if recipient has blocked current user
    if ((receiver.blockedUsers || []).includes(user._id)) {
      if (req.headers.accept?.includes('json')) {
        return res.status(403).json({ error: 'This user is not accepting messages from you.' });
      }
      req.flash('error', 'This user is not accepting messages from you.');
      return res.redirect(`/messages/${receiverId}`);
    }

    // Check if current user has blocked recipient
    if ((user.blockedUsers || []).includes(receiverId)) {
      if (req.headers.accept?.includes('json')) {
        return res.status(403).json({ error: 'You have blocked this user. Unblock them first to send messages.' });
      }
      req.flash('error', 'You have blocked this user. Unblock them first.');
      return res.redirect(`/messages/${receiverId}`);
    }

    // Check recipient message privacy setting
    const receiverPrivacy = receiver.messagePrivacy || 'everyone';
    if (receiverPrivacy === 'none' && user.role !== 'admin') {
      if (req.headers.accept?.includes('json')) {
        return res.status(403).json({ error: 'This user does not accept direct messages.' });
      }
      req.flash('error', 'This user does not accept direct messages.');
      return res.redirect(`/messages/${receiverId}`);
    }

    if (receiverPrivacy === 'followers') {
      const isFollower = (receiver.followers || []).includes(user._id);
      if (!isFollower && user.role !== 'admin') {
        if (req.headers.accept?.includes('json')) {
          return res.status(403).json({ error: 'Only followers can send direct messages to this creator.' });
        }
        req.flash('error', 'Only followers can send direct messages to this creator.');
        return res.redirect(`/messages/${receiverId}`);
      }
    }

    const cId = generateConversationId(user._id, receiverId);
    const existingMessages = MessageModel.findByConversation(cId);

    // Determine request status: if new conversation, set as 'pending' request
    let status: 'pending' | 'accepted' = 'accepted';
    if (existingMessages.length === 0) {
      const isMutual = (receiver.following || []).includes(user._id);
      status = isMutual ? 'accepted' : 'pending';
    } else {
      const hasAccepted = existingMessages.some(m => m.status === 'accepted');
      status = hasAccepted ? 'accepted' : 'pending';
    }

    const message = MessageModel.create({
      conversationId: cId,
      senderId: user._id,
      senderName: user.username,
      senderAvatar: user.avatar || '/uploads/default-avatar.png',
      receiverId: receiver._id,
      receiverName: receiver.username,
      receiverAvatar: receiver.avatar || '/uploads/default-avatar.png',
      content,
      status
    });

    // Notify receiver
    try {
      NotificationModel.notify(
        receiver._id,
        'mention',
        status === 'pending' ? 'New Message Request' : 'New Direct Message',
        `${user.username}: ${content.substring(0, 60)}...`,
        `/messages/${user._id}`
      );
    } catch (e) {}

    if (req.headers.accept?.includes('json')) {
      return res.json({ success: true, message });
    }

    res.redirect(`/messages/${receiverId}`);
  },

  // 4. Accept Message Request
  acceptRequest: async (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    const { userId: requesterId } = req.params;
    const cId = generateConversationId(user._id, requesterId);

    MessageModel.acceptConversationRequests(cId);
    req.flash('success', 'Message request accepted. You can now chat freely!');

    if (req.headers.accept?.includes('json')) {
      return res.json({ success: true });
    }
    res.redirect(`/messages/${requesterId}`);
  },

  // 5. Decline Message Request
  declineRequest: async (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    const { userId: requesterId } = req.params;
    const cId = generateConversationId(user._id, requesterId);

    MessageModel.declineConversationRequests(cId);
    req.flash('info', 'Message request declined.');

    if (req.headers.accept?.includes('json')) {
      return res.json({ success: true });
    }
    res.redirect('/messages');
  },

  // 6. Block User
  blockUser: async (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    const { userId: targetId } = req.params;
    if (targetId === user._id) return res.redirect('/messages');

    const blockedUsers = user.blockedUsers || [];
    if (!blockedUsers.includes(targetId)) {
      blockedUsers.push(targetId);
      UserModel.findByIdAndUpdate(user._id, { blockedUsers });
    }

    const targetUser = UserModel.findById(targetId);
    req.flash('success', `${targetUser ? targetUser.username : 'User'} has been blocked.`);

    if (req.headers.accept?.includes('json')) {
      return res.json({ success: true, isBlocked: true });
    }
    res.redirect(`/messages/${targetId}`);
  },

  // 7. Unblock User
  unblockUser: async (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    const { userId: targetId } = req.params;
    const blockedUsers = (user.blockedUsers || []).filter((id: string) => id !== targetId);
    UserModel.findByIdAndUpdate(user._id, { blockedUsers });

    const targetUser = UserModel.findById(targetId);
    req.flash('success', `${targetUser ? targetUser.username : 'User'} has been unblocked.`);

    if (req.headers.accept?.includes('json')) {
      return res.json({ success: true, isBlocked: false });
    }
    res.redirect(`/messages/${targetId}`);
  },

  // 8. Update Message Privacy Setting
  updatePrivacy: async (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    const privacy = req.body.privacy;
    if (['everyone', 'followers', 'none'].includes(privacy)) {
      UserModel.findByIdAndUpdate(user._id, { messagePrivacy: privacy });
      req.flash('success', 'Direct message privacy settings updated.');
    }

    if (req.headers.accept?.includes('json')) {
      return res.json({ success: true, privacy });
    }
    res.redirect('/messages');
  }
};
