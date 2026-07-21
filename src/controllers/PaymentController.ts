import { Request, Response } from 'express';
import { PaymentModel } from '../models/Payment.js';
import { PoemModel } from '../models/Poem.js';
import { MpesaService } from '../services/mpesaService.js';
import { EmailService } from '../services/emailService.js';
import { UserModel } from '../models/User.js';

export const PaymentController = {
  mpesaCallback: async (req: Request, res: Response) => {
    const result = MpesaService.parseCallback(req.body);

    if (!result.success) {
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const payment = PaymentModel.findOne({ checkoutRequestId: req.body?.Body?.stkCallback?.CheckoutRequestID });
    if (!payment || payment.status === 'completed') {
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    PaymentModel.findByIdAndUpdate(payment._id, {
      status: 'completed',
      mpesaReceiptNumber: result.receiptNumber,
      completedAt: new Date().toISOString()
    });

    const user = UserModel.findById(payment.userId);
    if (user) {
      await EmailService.sendPaymentReceived(user.email, user.username, payment.amount, payment.invoiceNumber);
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  },

  getPaymentHistory: (req: Request, res: Response) => {
    const user = res.locals.user;
    const payments = PaymentModel.find({ userId: user._id }).sort({ createdAt: -1 }).exec();
    res.render('payment-history', { title: 'Payment History', payments });
  },

  getSubmissions: (req: Request, res: Response) => {
    const user = res.locals.user;
    const poems = PoemModel.find({ submittedBy: user._id }).sort({ createdAt: -1 }).exec();
    res.render('submissions', { title: 'My Submissions', poems });
  }
};
