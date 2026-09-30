const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');
const sms = require('../utils/sms');

/**
 * ═══════════════════════════════════════════════════════
 *   PUBLIC: POST /api/appointments
 *   Book a new appointment
 * ═══════════════════════════════════════════════════════
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('phone').trim().notEmpty(),
    body('service').notEmpty(),
    body('date').notEmpty(),
    body('time').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const appt = new Appointment(req.body);
      await appt.save();

      /* Send booking SMS */
      const result = await sms.sendBookingSMS(appt);
      if (result.success) {
        appt.smsSent.booking = true;
        await appt.save();
      }

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully! We will contact you shortly.',
        appointment: appt
      });
    } catch (err) {
      console.error('Booking error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * ═══════════════════════════════════════════════════════
 *   ADMIN: GET /api/appointments
 *   List all appointments (optionally filter by status)
 * ═══════════════════════════════════════════════════════
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== 'all' ? { status } : {};

    const appointments = await Appointment.find(filter)
      .populate('paymentId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ═══════════════════════════════════════════════════════
 *   ADMIN: GET /api/appointments/stats/summary
 *   Dashboard statistics
 * ═══════════════════════════════════════════════════════
 */
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const [
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      paidCount
    ] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'confirmed' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      Appointment.countDocuments({
        paymentStatus: { $in: ['deposit_paid', 'paid'] }
      })
    ]);

    res.json({
      success: true,
      stats: { total, pending, confirmed, completed, cancelled, paidCount }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ═══════════════════════════════════════════════════════
 *   ADMIN: PATCH /api/appointments/:id
 *   Update appointment status (with SMS notification)
 * ═══════════════════════════════════════════════════════
 */
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    /* Send confirmation SMS */
    if (status === 'confirmed' && !appt.smsSent.confirmed) {
      const r = await sms.sendConfirmedSMS(appt);
      if (r.success) {
        appt.smsSent.confirmed = true;
        await appt.save();
      }
    }

    /* Send cancellation SMS */
    if (status === 'cancelled' && !appt.smsSent.cancelled) {
      const r = await sms.sendCancelledSMS(appt);
      if (r.success) {
        appt.smsSent.cancelled = true;
        await appt.save();
      }
    }

    res.json({ success: true, appointment: appt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ═══════════════════════════════════════════════════════
 *   ADMIN: DELETE /api/appointments/:id
 * ═══════════════════════════════════════════════════════
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndDelete(req.params.id);
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    res.json({ success: true, message: 'Appointment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;