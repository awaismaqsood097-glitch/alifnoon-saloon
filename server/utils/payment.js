/**
 * ═══════════════════════════════════════════════════════
 *   Payment Utility — Stripe (+ JazzCash/Easypaisa ready)
 * ═══════════════════════════════════════════════════════
 *   Configure in .env:
 *     STRIPE_SECRET_KEY
 *     STRIPE_PUBLISHABLE_KEY
 *     STRIPE_WEBHOOK_SECRET
 *     STRIPE_CURRENCY
 * ═══════════════════════════════════════════════════════
 */

let stripe = null;

/* ─────────── Lazy init Stripe ─────────── */
function getStripe() {
  if (stripe) return stripe;

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('xxxxx')) {
    return null;
  }

  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    return stripe;
  } catch (err) {
    console.error('❌ Stripe init failed:', err.message);
    return null;
  }
}

/* ─────────── Convert PKR to smallest Stripe unit ─────────── */
function toStripeAmount(pkr) {
  /* Stripe expects amount in smallest currency unit.
     For PKR: 1 PKR = 100 paisa
     For USD: 1 USD = 100 cents */
  return Math.round(pkr * 100);
}

/* ═══════════════ Create Payment Intent ═══════════════ */
async function createStripeIntent({
  amountPKR,
  appointmentId,
  customerName,
  customerPhone,
  customerEmail
}) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    throw new Error(
      'Stripe not configured. Please set STRIPE_SECRET_KEY in .env file.'
    );
  }

  const currency = (process.env.STRIPE_CURRENCY || 'pkr').toLowerCase();

  const intent = await stripeClient.paymentIntents.create({
    amount: toStripeAmount(amountPKR),
    currency,
    automatic_payment_methods: { enabled: true },
    description: `ALIFNOON SALON deposit for appointment ${appointmentId}`,
    metadata: {
      appointmentId: String(appointmentId),
      customerName: customerName || '',
      customerPhone: customerPhone || ''
    },
    receipt_email: customerEmail || undefined
  });

  return intent;
}

/* ═══════════════ Retrieve Intent ═══════════════ */
async function retrieveStripeIntent(id) {
  const stripeClient = getStripe();
  if (!stripeClient) throw new Error('Stripe not configured.');
  return stripeClient.paymentIntents.retrieve(id);
}

/* ═══════════════ Verify Webhook Signature ═══════════════ */
function constructStripeEvent(rawBody, signature) {
  const stripeClient = getStripe();
  if (!stripeClient) throw new Error('Stripe not configured.');

  return stripeClient.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

module.exports = {
  getStripe,
  createStripeIntent,
  retrieveStripeIntent,
  constructStripeEvent,
  toStripeAmount
};