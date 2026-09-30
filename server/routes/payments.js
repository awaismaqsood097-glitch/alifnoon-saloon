const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');
const sms = require('../utils/sms');
const paymentUtil = require('../utils/payment');

/**
 * ═══════════════════════════════════════════════════════
 *   PUBLIC: GET /api/payments/config
 *   Return payment gateway config for frontend
 * ═══════════════════════════════════════════════════════
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    gateway: process.env.PAYMENT_GATEWAY || 'stripe',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    currency: process.env.STRIPE_CURRENCY || 'pkr',
    depositAmount: Number(process.env.DEPOSIT_AMOUNT_PKR || 2000)
  });
});

/**
 * ═══════════════════════════════════════════════════════
 *   PUBLIC: POST /api/payments/create-intent
 *   Create Stripe PaymentIntent for an appointment
 * ═══════════════════════════════════════════════════════
 */
router.post('/create-intent', async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'appointmentId is required'
      });
    }

    const appt = await Appointment.findById(appointmentId);
    if (!appt) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    /* Already paid? */
    if (['deposit_paid', 'paid'].includes(appt.paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'This appointment is already paid'
      });
    }

    const amountPKR = Number(process.env.DEPOSIT_AMOUNT_PKR || 2000);
    const gateway = process.env.PAYMENT_GATEWAY || 'stripe';

    /* Create payment record */
    const payment = new Payment({
      appointmentId: appt._id,
      gateway,
      amount: amountPKR,
      currency: (process.env.STRIPE_CURRENCY || 'pkr').toLowerCase(),
      status: 'pending',
      customerName: appt.name,
      customerPhone: appt.phone,
      customerEmail: appt.email
    });

    /* ─────────── STRIPE ─────────── */
    if (gateway === 'stripe') {
      const intent = await paymentUtil.createStripeIntent({
        amountPKR,
        appointmentId: appt._id,
        customerName: appt.name,
        customerPhone: appt.phone,
        customerEmail: appt.email
      });

      payment.stripePaymentIntentId = intent.id;
      payment.stripeClientSecret = intent.client_secret;
      await payment.save();

      /* Link payment to appointment */
      appt.paymentId = payment._id;
      appt.amount = amountPKR;
      await appt.save();

      return res.json({
        success: true,
        gateway: 'stripe',
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount: amountPKR,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      });
    }

    /* ─────────── OTHER GATEWAYS (JazzCash / Easypaisa) ───────────
       Ye abhi implement nahi hain. Jab chahiye, yahan add karein.
    */
    payment.transactionId = 'PENDING_' + Date.now();
    await payment.save();

    return res.json({
      success: false,
      message: `Gateway "${gateway}" is not implemented yet. Please use Stripe.`,
      paymentId: payment._id
    });
  } catch (err) {
    console.error('Create intent error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ═══════════════════════════════════════════════════════
 *   PUBLIC: POST /api/payments/confirm
 *   Confirm payment after Stripe succeeds on frontend
 * ═══════════════════════════════════════════════════════
 */
router.post('/confirm', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentIntentId is required'
      });
    }

    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    /* Already confirmed? */
    if (payment.status === 'succeeded') {
      return res.json({
        success: true,
        message: 'Payment already confirmed',
        payment
      });
    }

    /* Verify with Stripe */
    const intent = await paymentUtil.retrieveStripeIntent(paymentIntentId);

    if (intent.status === 'succeeded') {
      payment.status = 'succeeded';
      payment.rawResponse = intent;
      await payment.save();

      /* Update appointment */
      const appt = await Appointment.findById(payment.appointmentId);
      if (appt) {
        appt.paymentStatus = 'deposit_paid';
        await appt.save();

        /* Send payment SMS */
        if (!appt.smsSent.payment) {
          const r = await sms.sendPaymentSMS(appt, payment.amount);
          if (r.success) {
            appt.smsSent.payment = true;
            await appt.save();
          }
        }
      }

      return res.json({
        success: true,
        message: 'Payment confirmed',
        payment
      });
    }

    return res.json({
      success: false,
      message: `Payment status: ${intent.status}`,
      payment
    });
  } catch (err) {
    console.error('Confirm payment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ═══════════════════════════════════════════════════════
 *   PUBLIC: POST /api/payments/webhook
 *   Stripe webhook (handles payments even if user closes browser)
 *   NOTE: Raw body — server.js handles this specially
 * ═══════════════════════════════════════════════════════
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = paymentUtil.constructStripeEvent(req.body, sig);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const payment = await Payment.findOne({
          stripePaymentIntentId: intent.id
        });

        if (payment && payment.status !== 'succeeded') {
          payment.status = 'succeeded';
          payment.rawResponse = intent;
          await payment.save();

          const appt = await Appointment.findById(payment.appointmentId);
          if (appt) {
            appt.paymentStatus = 'deposit_paid';
            await appt.save();

            if (!appt.smsSent.payment) {
              const r = await sms.sendPaymentSMS(appt, payment.amount);
              if (r.success) {
                appt.smsSent.payment = true;
                await appt.save();
              }
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const payment = await Payment.findOne({
          stripePaymentIntentId: intent.id
        });
        if (payment) {
          payment.status = 'failed';
          payment.rawResponse = intent;
          await payment.save();
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ received: false });
  }
});

/**
 * ═══════════════════════════════════════════════════════
 *   ADMIN: GET /api/payments
 *   List all payments
 * ═══════════════════════════════════════════════════════
 */
router.get('/', auth, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('appointmentId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: payments.length, payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;