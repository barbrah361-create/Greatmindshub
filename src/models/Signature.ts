import { DBModel } from '../config/db.js';

export interface Signature {
  _id: string;
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  signatureData: string; // Base64 canvas draw data, text string, or uploaded image URL
  signatureType: 'draw' | 'type' | 'upload';
  fontStyle?: string; // Optional font name if type-based signature
  message?: string;
  createdAt: string;
}

export const SignatureDB = new DBModel<Signature>('signatures');

export const SignatureModel = {
  find: (query?: any) => SignatureDB.find(query),
  findOne: (query?: any) => SignatureDB.findOne(query),
  findById: (id: string) => SignatureDB.findById(id),
  create: (data: Partial<Signature>) => {
    return SignatureDB.create({
      createdAt: new Date().toISOString(),
      ...data
    });
  },
  findByIdAndUpdate: (id: string, update: Partial<Signature>) => SignatureDB.findByIdAndUpdate(id, update),
  findByIdAndDelete: (id: string) => SignatureDB.findByIdAndDelete(id),
  countDocuments: (query?: any) => SignatureDB.countDocuments(query)
};
