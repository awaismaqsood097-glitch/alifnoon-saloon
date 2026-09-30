const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  /* ═══════════════ Customer Info ═══════════════ */
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },

  /* ═══════════════ Booking Details ═══════════════ */
  service: {
    type: String,
    required: [true, 'Service is required'],
    enum: [
      'Haircut & Styling',
      'Hair Coloring',
      'Hair Treatment',
      'Bridal Makeup',
      'Party Makeup',
      'Facial & Skincare',
      'Manicure & Pedicure',
      'Waxing & Threading',
      'Mehndi Design',
      'Full Bridal Package'
    ]
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  time: {
    type: String,
    required: [true, 'Time is required']
  },
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },

  /* ═══════════════ Status ═══════════════ */
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },

  /* ═══════════════ Payment Info ═══════════════ */
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'deposit_paid', 'paid', 'refunded'],
    default: 'unpaid'
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  },
  amount: {
    type: Number,
    default: 0
  },

  /* ═══════════════ SMS Tracking ═══════════════ */
  smsSent: {
    booking: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    confirmed: { type: Boolean, default: false },
    cancelled: { type: Boolean, default: false }
  },

  /* ═══════════════ Timestamps ═══════════════ */
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Appointment', appointmentSchema);