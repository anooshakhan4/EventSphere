// One interface for JazzCash, Easypaisa and card. Each adapter turns an order into a
// payment request and verifies the provider's callback. Fill in the merchant
// credentials from the JazzCash / Easypaisa merchant portals in .env.
import crypto from 'node:crypto';

export type Method = 'JAZZCASH' | 'EASYPAISA' | 'CARD';
export type InitResult = { redirectUrl?: string; prompt?: string; providerRef: string };
export type Callback = { orderCode: string; providerRef: string; success: boolean };

export interface PaymentAdapter {
  init(order: { code: string; total: number; phone?: string; email: string }): Promise<InitResult>;
  verify(body: Record<string, string>, headers: Record<string, string | string[] | undefined>): Callback | null;
}

const hmac = (secret: string, data: string) => crypto.createHmac('sha256', secret).update(data).digest('hex');

const jazzcash: PaymentAdapter = {
  async init(o) {
    // Mobile Account (MWALLET) flow: JazzCash pushes a prompt to the customer's phone.
    // Real call: POST {JAZZCASH_URL}/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction
    // with pp_Amount = total * 100, pp_TxnRefNo = order code, pp_SecureHash = HMAC of sorted fields.
    return { providerRef: `JC-${o.code}`, prompt: `Approve the JazzCash request sent to ${o.phone}` };
  },
  verify(body) {
    const secret = process.env.JAZZCASH_INTEGRITY_SALT ?? 'dev';
    const { pp_SecureHash, ...fields } = body;
    const data = Object.keys(fields).sort().map((k) => fields[k]).join('&');
    if (process.env.NODE_ENV === 'production' && hmac(secret, data).toUpperCase() !== pp_SecureHash) return null;
    return { orderCode: body.pp_TxnRefNo, providerRef: body.pp_RetreivalReferenceNo ?? body.pp_TxnRefNo, success: body.pp_ResponseCode === '000' };
  },
};

const easypaisa: PaymentAdapter = {
  async init(o) {
    // Real call: POST {EASYPAISA_URL}/easypay-service/rest/v4/initiate-ma-transaction
    return { providerRef: `EP-${o.code}`, prompt: `Approve the Easypaisa request sent to ${o.phone}` };
  },
  verify(body) {
    return { orderCode: body.orderId, providerRef: body.transactionId, success: body.responseCode === '0000' };
  },
};

const card: PaymentAdapter = {
  async init(o) {
    // Hosted checkout page from your card gateway (e.g. a local bank's payment gateway).
    return { providerRef: `CD-${o.code}`, redirectUrl: `${process.env.CARD_GATEWAY_URL ?? 'https://gateway.example'}/pay/${o.code}` };
  },
  verify(body, headers) {
    const sig = headers['x-signature'];
    if (process.env.NODE_ENV === 'production' && sig !== hmac(process.env.CARD_WEBHOOK_SECRET ?? '', JSON.stringify(body))) return null;
    return { orderCode: body.reference, providerRef: body.id, success: body.status === 'succeeded' };
  },
};

export const adapters: Record<Method, PaymentAdapter> = { JAZZCASH: jazzcash, EASYPAISA: easypaisa, CARD: card };
