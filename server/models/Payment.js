const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  /* ═══════════════ Related Appointment ═══════════════ */
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },

  /* ═══════════════ Payment Details ═══════════════ */
  gateway: {
    type: String,
    enum: ['stripe', 'jazzcash', 'easypaisa', 'manual'],
    default: 'stripe'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'pkr'
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
    default: 'pending'
  },

  /* ═══════════════ Stripe Specific ═══════════════ */
  stripePaymentIntentId: {
    type: String,
    default: ''
  },
  stripeClientSecret: {
    type: String,
    default: ''
  },

  /* ═══════════════ Generic Transaction ═══════════════ */
  transactionId: {
    type: String,
    default: ''
  },

  /* ═══════════════ Customer Info ═══════════════ */
  customerName: {
    type: String,
    default: ''
  },
  customerPhone: {
    type: String,
    default: ''
  },
  customerEmail: {
    type: String,
    default: ''
  },

  /* ═══════════════ Raw Response (Stripe/JazzCash) ═══════════════ */
  rawResponse: {
    type: Object,
    default: {}
  },

  /* ═══════════════ Timestamps ═══════════════ */
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

/* Auto-update updatedAt on save */
paymentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);