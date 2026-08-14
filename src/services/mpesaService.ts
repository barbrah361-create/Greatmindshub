import crypto from 'crypto';

const SUBMISSION_FEE = 100;

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

export const MpesaService = {
  SUBMISSION_FEE,

  async initiateStkPush(phoneNumber: string, accountReference: string, description: string): Promise<StkPushResult> {
    const formattedPhone = phoneNumber.replace(/\D/g, '').replace(/^0/, '254');
    
    // PayHero Credentials
    const basicAuthToken = process.env.PAYHERO_BASIC_AUTH || 'Y3lUMVpIUHlBMzY0YUVNaW95UEk6ZTN5Mks4ZUNsNGdNV0FoZEV3Ykg5NDlqbUNFdkNTSG4ySFl6a3hRVg==';
    const channelId = parseInt(process.env.PAYHERO_CHANNEL_ID || '11558', 10);
    const callbackUrl = `${process.env.APP_URL || 'https://ending-disaster-waged.ngrok-free.dev'}/api/mpesa/callback`;

    // Simulate if PAYHERO_SIMULATE is explicitly 'true'
    if (process.env.PAYHERO_SIMULATE === 'true') {
      console.log('[MpesaService] Running in Development Mode - Simulating STK Push');
      const devId = `DEV_${crypto.randomBytes(8).toString('hex')}`;
      return { success: true, checkoutRequestId: devId, merchantRequestId: devId };
    }

    try {
      const response = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: SUBMISSION_FEE,
          phone_number: formattedPhone,
          channel_id: channelId,
          provider: 'm-pesa',
          external_reference: accountReference.slice(0, 20),
          callback_url: callbackUrl
        })
      });

      const data = await response.json();

      if (response.ok && (data.success === true || data.status === 'success' || data.CheckoutRequestID)) {
        return {
          success: true,
          checkoutRequestId: data.CheckoutRequestID || data.checkout_request_id || `PAY_${Date.now()}`,
          merchantRequestId: data.MerchantRequestID || data.merchant_request_id || `MERCH_${Date.now()}`
        };
      }
      return { success: false, error: data.message || data.error || `PayHero STK push failed (Status ${response.status})` };
    } catch (err: any) {
      console.error('[MpesaService] PayHero STK Push Error:', err);
      return { success: false, error: err.message || 'PayHero request failed' };
    }
  },

  parseCallback(body: any): StkCallbackResult {
    try {
      if (!body) return { success: false, error: 'Empty callback body' };

      // PayHero Callback Format
      const checkoutRequestId = body.CheckoutRequestID || body.checkoutRequestID || body.checkout_request_id;
      const status = String(body.status || body.Status || '');
      const isSuccess = status.toLowerCase() === 'success' || body.ResultCode === 0 || body.ResultCode === '0';

      if (!checkoutRequestId) {
        return { success: false, error: 'Missing checkout request ID' };
      }

      if (!isSuccess) {
        return { success: false, error: body.message || body.ResultDesc || 'Payment failed' };
      }

      return {
        success: true,
        receiptNumber: String(body.MpesaReceiptNumber || body.mpesa_receipt_number || body.receipt || body.MPESA_Reference || `REC_${Date.now()}`),
        amount: Number(body.amount || body.Amount || SUBMISSION_FEE),
        phoneNumber: String(body.phoneNumber || body.phone_number || body.phone || '')
      };
    } catch (err: any) {
      console.error('[MpesaService] Callback Parse Error:', err);
      return { success: false, error: 'Callback parse error: ' + err.message };
    }
  }
};
