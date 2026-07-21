import crypto from 'crypto';

const SUBMISSION_FEE = 50;

interface StkPushResult {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  error?: string;
}

interface StkCallbackResult {
  success: boolean;
  receiptNumber?: string;
  amount?: number;
  phoneNumber?: string;
  error?: string;
}

function getAccessToken(): Promise<string | null> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const env = process.env.MPESA_ENV || 'sandbox';
  const baseUrl = env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

  if (!consumerKey || !consumerSecret) {
    console.log('[M-Pesa] Credentials not configured - using dev mode');
    return Promise.resolve(null);
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  return fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  })
    .then(r => r.json())
    .then(data => data.access_token || null)
    .catch(() => null);
}

function generatePassword(): string {
  const shortcode = process.env.MPESA_SHORTCODE || '174379';
  const passkey = process.env.MPESA_PASSKEY || '';
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  return Buffer.from(shortcode + passkey + timestamp).toString('base64');
}

export const MpesaService = {
  SUBMISSION_FEE,

  async initiateStkPush(phoneNumber: string, accountReference: string, description: string): Promise<StkPushResult> {
    const formattedPhone = phoneNumber.replace(/\D/g, '').replace(/^0/, '254');
    const token = await getAccessToken();

    if (!token) {
      const devId = `DEV_${crypto.randomBytes(8).toString('hex')}`;
      return { success: true, checkoutRequestId: devId, merchantRequestId: devId };
    }

    const env = process.env.MPESA_ENV || 'sandbox';
    const baseUrl = env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const callbackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/mpesa/callback`;

    try {
      const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          BusinessShortCode: process.env.MPESA_SHORTCODE || '174379',
          Password: generatePassword(),
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: SUBMISSION_FEE,
          PartyA: formattedPhone,
          PartyB: process.env.MPESA_SHORTCODE || '174379',
          PhoneNumber: formattedPhone,
          CallBackURL: callbackUrl,
          AccountReference: accountReference.slice(0, 12),
          TransactionDesc: description.slice(0, 13)
        })
      });
      const data = await response.json();
      if (data.ResponseCode === '0') {
        return {
          success: true,
          checkoutRequestId: data.CheckoutRequestID,
          merchantRequestId: data.MerchantRequestID
        };
      }
      return { success: false, error: data.errorMessage || data.ResponseDescription || 'STK push failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'M-Pesa request failed' };
    }
  },

  parseCallback(body: any): StkCallbackResult {
    try {
      const result = body?.Body?.stkCallback;
      if (!result) return { success: false, error: 'Invalid callback' };

      if (result.ResultCode !== 0) {
        return { success: false, error: result.ResultDesc || 'Payment failed' };
      }

      const metadata = result.CallbackMetadata?.Item || [];
      const get = (name: string) => metadata.find((i: any) => i.Name === name)?.Value;

      return {
        success: true,
        receiptNumber: String(get('MpesaReceiptNumber') || ''),
        amount: Number(get('Amount') || SUBMISSION_FEE),
        phoneNumber: String(get('PhoneNumber') || '')
      };
    } catch {
      return { success: false, error: 'Callback parse error' };
    }
  }
};
