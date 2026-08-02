import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCompletedAccessPayment } from '../src/middleware/authMiddleware.js';
import { PaymentModel } from '../src/models/Payment.js';
import { UserModel } from '../src/models/User.js';

test('completed access payments unlock feature access', async () => {
  const unique = Date.now();
  const user = await UserModel.create({
    username: `paytester${unique}`,
    email: `paytester${unique}@example.com`,
    password: 'secret123'
  });

  PaymentModel.create({
    userId: user._id,
    feature: 'upload',
    contentType: 'book',
    contentTitle: 'Upload Access',
    amount: 100,
    currency: 'KES',
    phoneNumber: '0726625144',
    status: 'completed',
    invoiceNumber: 'INV-TEST-1'
  });

  assert.equal(hasCompletedAccessPayment(user, 'upload', 100), true);
  assert.equal(hasCompletedAccessPayment(user, 'live', 100), false);
});
