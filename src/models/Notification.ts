import { DBModel } from '../config/db.js';

export interface Notification {
  _id: string;
  id: string;
  userId: string;
  type: 'follow' | 'comment' | 'reply' | 'approval' | 'rejection' | 'payment' | 'mention' | 'announcement';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export const NotificationDB = new DBModel<Notification>('notifications');

export const NotificationModel = {
  find: (query?: any) => NotificationDB.find(query),
  findOne: (query?: any) => NotificationDB.findOne(query),
  findById: (id: string) => NotificationDB.findById(id),
  create: (data: Partial<Notification>) => NotificationDB.create({ read: false, ...data }),
  findByIdAndUpdate: (id: string, update: Partial<Notification>) => NotificationDB.findByIdAndUpdate(id, update),
  countDocuments: (query?: any) => NotificationDB.countDocuments(query),

  notify: (userId: string, type: Notification['type'], title: string, message: string, link?: string) =>
    NotificationDB.create({ userId, type, title, message, link, read: false }),

  getUnreadCount: (userId: string) =>
    NotificationDB.find({ userId, read: false }).exec().length
};
