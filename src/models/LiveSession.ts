import { DBModel } from '../config/db.js';

export interface LiveSession {
  _id: string;
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  title: string;
  type: 'poem' | 'novel';
  workTitle: string;
  workContent: string;
  viewersCount: number;
  likesCount: number;
  isLive: boolean;
  gifts: { userId: string; username: string; giftType: string; points: number; sentAt: string }[];
  totalGiftPoints: number;
  coHosts: string[];
  coHostRequests: string[];
  createdAt: string;
}

export const LiveSessionDB = new DBModel<LiveSession>('live_sessions');

export const LiveSessionModel = {
  find: (query?: any) => LiveSessionDB.find(query),
  findById: (id: string) => LiveSessionDB.findById(id),
  create: (data: Partial<LiveSession>) => LiveSessionDB.create({
    viewersCount: 1,
    likesCount: 0,
    isLive: true,
    workContent: '',
    gifts: [],
    totalGiftPoints: 0,
    coHosts: [],
    coHostRequests: [],
    ...data
  }),
  findByIdAndUpdate: (id: string, update: Partial<LiveSession>) => LiveSessionDB.findByIdAndUpdate(id, update),
  findByIdAndDelete: (id: string) => LiveSessionDB.findByIdAndDelete(id),
  findActive: () => LiveSessionDB.find({ isLive: true })
};
