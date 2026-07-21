import { CommentDB } from '../config/db.js';

export interface CommentReply {
  username: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

export interface Comment {
  _id: string;
  id: string;
  novelId: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  rating?: number; // Optional review star count (1-5)
  replies: CommentReply[];
  isReported: boolean;
  createdAt: string;
}

export const CommentModel = {
  find: (query?: any) => CommentDB.find(query),
  findOne: (query?: any) => CommentDB.findOne(query),
  findById: (id: string) => CommentDB.findById(id),
  create: (data: Partial<Comment>) => {
    return CommentDB.create({
      replies: [],
      isReported: false,
      ...data
    });
  },
  findByIdAndUpdate: (id: string, update: Partial<Comment>) => CommentDB.findByIdAndUpdate(id, update),
  findByIdAndDelete: (id: string) => CommentDB.findByIdAndDelete(id)
};
