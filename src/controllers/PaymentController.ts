import { Request, Response } from 'express';
import { PaymentModel } from '../models/Payment.js';
import { PoemModel } from '../models/Poem.js';
import { MpesaService } from '../services/mpesaService.js';
import { EmailService } from '../services/emailService.js';
import { UserModel } from '../models/User.js';

const ACCESS_FEE_KES = 100;
const ACCESS_PHONE = '0726625144';

// Simple in-memory SSE subscribers map: userId -> Set<Response>
const paymentSubscribers: Record<string, Set<Response>> = {};

function addSubscriber(userId: string, res: Response) {
  if (!paymentSubscribers[userId]) paymentSubscribers[userId] = new Set();
  paymentSubscribers[userId].add(res);
}

function removeSubscriber(userId: string, res: Response) {
  const set = paymentSubscribers[userId];
  if (!set) return;
  set.delete(res);
  if (set.size === 0) delete paymentSubscribers[userId];
}

function broadcastPayment(userId: string, payload: any) {
  const set = paymentSubscribers[userId];
  if (!set) return;
  const data = JSON.stringify(payload);
  set.forEach((res) => {
    try {
      res.write(`event: payment\n`);
      res.write(`data: ${data}\n\n`);
    } catch (e) {
      // ignore writes to closed streams
    }
  });
}

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

    // Broadcast update to any connected SSE clients for this user
    broadcastPayment(String(payment.userId), {
      status: 'completed',
      checkoutRequestId: req.body?.Body?.stkCallback?.CheckoutRequestID,
      mpesaReceiptNumber: result.receiptNumber,
      amount: payment.amount,
      invoiceNumber: payment.invoiceNumber
    });

    const user = UserModel.findById(payment.userId);
    if (user) {
      await EmailService.sendPaymentReceived(user.email, user.username, payment.amount, payment.invoiceNumber);
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  },

  initiateAccessPayment: async (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const feature = (req.body.feature as 'upload' | 'live' | 'read') || 'read';
    const result = await MpesaService.initiateStkPush(ACCESS_PHONE, `ACCESS-${feature}-${user._id.slice(0, 6)}`, `Unlock ${feature} access`);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error || 'Payment could not be started.' });
    }

    const payment = PaymentModel.create({
      userId: user._id,
      feature,
      contentType: 'book',
      contentTitle: `${feature} access`,
      amount: ACCESS_FEE_KES,
      phoneNumber: ACCESS_PHONE,
      checkoutRequestId: result.checkoutRequestId,
      merchantRequestId: result.merchantRequestId,
      invoiceNumber: `INV-${feature.toUpperCase()}-${Date.now()}`
    });

    return res.json({ success: true, payment, phoneNumber: ACCESS_PHONE, amount: ACCESS_FEE_KES, message: `Please complete the M-Pesa prompt on ${ACCESS_PHONE} to unlock this feature.` });
  },

  getPaymentHistory: (req: Request, res: Response) => {
    const user = res.locals.user;
    const payments = PaymentModel.find({ userId: user._id }).sort({ createdAt: -1 }).exec();
    res.render('payment-history', { title: 'Payment History', payments });
  },

  getPaymentStatus: (req: Request, res: Response) => {
    const user = res.locals.user;
    const checkoutRequestId = String(req.query?.checkoutRequestId || '');
    if (!checkoutRequestId) return res.status(400).json({ success: false, message: 'Missing checkoutRequestId' });

    const payment = PaymentModel.findOne({ checkoutRequestId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (String(payment.userId) !== String(user._id)) return res.status(403).json({ success: false, message: 'Forbidden' });

    return res.json({ success: true, status: payment.status, payment });
  },

  streamPayments: (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.status(401).end();

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });
    res.write('\n');

    addSubscriber(String(user._id), res);

    // Send a ping every 20s to keep connection alive
    const keepAlive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (e) {}
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAlive);
      removeSubscriber(String(user._id), res);
    });
  },

  getSubmissions: (req: Request, res: Response) => {
    const user = res.locals.user;
    const poems = PoemModel.find({ submittedBy: user._id }).sort({ createdAt: -1 }).exec();
    res.render('submissions', { title: 'My Submissions', poems });
  }
};
