import { DBModel } from '../config/db.js';
import type { ContentType, PaymentStatus } from '../types/common.js';

export interface Payment {
  _id: string;
  id: string;
  userId: string;
  contentType: ContentType;
  contentId?: string;
  contentTitle: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  status: PaymentStatus;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  mpesaReceiptNumber?: string;
  invoiceNumber: string;
  createdAt: string;
  completedAt?: string;
}

export const PaymentDB = new DBModel<Payment>('payments');

export const PaymentModel = {
  find: (query?: any) => PaymentDB.find(query),
  findOne: (query?: any) => PaymentDB.findOne(query),
  findById: (id: string) => PaymentDB.findById(id),
  create: (data: Partial<Payment>) => {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    return PaymentDB.create({
      currency: 'KES',
      status: 'pending',
      invoiceNumber,
      ...data
    });
  },
  findByIdAndUpdate: (id: string, update: Partial<Payment>) => PaymentDB.findByIdAndUpdate(id, update),
  countDocuments: (query?: any) => PaymentDB.countDocuments(query)
};
