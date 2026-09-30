const express = require('express');
const router = express.Router();
const sms = require('../utils/sms');
const auth = require('../middleware/auth');

/**
 * ═══════════════════════════════════════════════════════
 *   ADMIN: POST /api/sms/test
 *   Send a test SMS to verify Twilio configuration
 * ═══════════════════════════════════════════════════════
 */
router.post('/test', auth, async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required (e.g. +923406753402)'
    });
  }

  const salonName = process.env.SALON_NAME || 'ALIFNOON SALON';
  const result = await sms.sendSMS(
    phone,
    `${salonName}\n` +
      `Test SMS from admin dashboard ✅\n` +
      `Aap ka SMS notification system kaam kar raha hai.\n` +
      `Time: ${new Date().toLocaleString('en-GB')}`
  );

  if (result.success) {
    return res.json({
      success: true,
      message: result.mock
        ? 'SMS_ENABLED is false — check server console to see the message'
        : 'Test SMS sent successfully',
      sid: result.sid || null,
      mock: result.mock || false
    });
  }

  return res.status(500).json({
    success: false,
    message: 'SMS failed',
    error: result.error
  });
});

/**
 * ═══════════════════════════════════════════════════════
 *   ADMIN: GET /api/sms/status
 *   Check if SMS is enabled and configured
 * ═══════════════════════════════════════════════════════
 */
router.get('/status', auth, (req, res) => {
  const enabled = process.env.SMS_ENABLED === 'true';
  const configured =
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_PHONE_NUMBER &&
    !process.env.TWILIO_ACCOUNT_SID.includes('xxxxx');

  res.json({
    success: true,
    smsEnabled: enabled,
    twilioConfigured: configured,
    provider: 'twilio',
    fromNumber: configured ? process.env.TWILIO_PHONE_NUMBER : null,
    note: !enabled
      ? 'SMS_ENABLED=false — messages are logged to console only'
      : !configured
      ? 'Twilio credentials not set — update .env file'
      : 'SMS system is active'
  });
});

module.exports = router;