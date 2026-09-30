/**
 * ═══════════════════════════════════════════════════════
 *   Twilio SMS Utility
 * ═══════════════════════════════════════════════════════
 *   Configure in .env:
 *     TWILIO_ACCOUNT_SID
 *     TWILIO_AUTH_TOKEN
 *     TWILIO_PHONE_NUMBER
 *     SMS_ENABLED=true (to actually send)
 *
 *   If SMS_ENABLED=false, messages are logged to console.
 * ═══════════════════════════════════════════════════════
 */

let twilioClient = null;

/* ─────────── Lazy init Twilio client ─────────── */
function getClient() {
  if (twilioClient) return twilioClient;

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }

  try {
    const twilio = require('twilio');
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    return twilioClient;
  } catch (err) {
    console.error('❌ Twilio init failed:', err.message);
    return null;
  }
}

/* ─────────── Pakistani number → E.164 (+92XXXXXXXXXX) ─────────── */
function normalizePhone(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/[^\d+]/g, '');

  if (p.startsWith('+')) return p;
  if (p.startsWith('0092')) return '+' + p.slice(2);
  if (p.startsWith('92')) return '+' + p;
  if (p.startsWith('0')) return '+92' + p.slice(1);
  return '+92' + p;
}

/* ─────────── Core send SMS ─────────── */
async function sendSMS(to, body) {
  const enabled = process.env.SMS_ENABLED === 'true';
  const client = getClient();
  const toE164 = normalizePhone(to);

  /* If disabled or not configured → log to console */
  if (!enabled || !client) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📱 [SMS ${enabled ? 'NOT CONFIGURED' : 'DISABLED'}]`);
    console.log(`   To: ${toE164}`);
    console.log(`   Body:\n${body}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { success: true, mock: true };
  }

  /* Actually send via Twilio */
  try {
    const msg = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toE164
    });
    console.log(`✅ SMS sent to ${toE164} (SID: ${msg.sid})`);
    return { success: true, sid: msg.sid };
  } catch (err) {
    console.error(`❌ SMS failed to ${toE164}:`, err.message);
    return { success: false, error: err.message };
  }
}

/* ═══════════════ Templated Messages ═══════════════ */

/* 1. Booking confirmation */
async function sendBookingSMS(appt) {
  const salon = process.env.SALON_NAME || 'ALIFNOON SALON';
  const body =
    `${salon}\n` +
    `Assalam-o-Alaikum ${appt.name}!\n` +
    `Aap ki appointment book ho gayi hai.\n` +
    `Service: ${appt.service}\n` +
    `Date: ${new Date(appt.date).toLocaleDateString('en-GB')}\n` +
    `Time: ${appt.time}\n` +
    `Confirm karne ke liye hum jald contact karenge. Shukriya!`;
  return sendSMS(appt.phone, body);
}

/* 2. Payment received */
async function sendPaymentSMS(appt, amount) {
  const salon = process.env.SALON_NAME || 'ALIFNOON SALON';
  const body =
    `${salon}\n` +
    `Payment received: Rs. ${amount}\n` +
    `Appointment: ${appt.service}\n` +
    `Date: ${new Date(appt.date).toLocaleDateString('en-GB')} at ${appt.time}\n` +
    `Shukriya! Aap ki seat confirm hai.`;
  return sendSMS(appt.phone, body);
}

/* 3. Appointment confirmed (by admin) */
async function sendConfirmedSMS(appt) {
  const salon = process.env.SALON_NAME || 'ALIFNOON SALON';
  const body =
    `${salon}\n` +
    `Aap ki appointment CONFIRM ho gayi hai ✅\n` +
    `Service: ${appt.service}\n` +
    `Date: ${new Date(appt.date).toLocaleDateString('en-GB')} at ${appt.time}\n` +
    `Baqi tafseel ke liye call karein. Shukriya!`;
  return sendSMS(appt.phone, body);
}

/* 4. Appointment cancelled (by admin) */
async function sendCancelledSMS(appt) {
  const salon = process.env.SALON_NAME || 'ALIFNOON SALON';
  const body =
    `${salon}\n` +
    `Aap ki appointment cancel kar di gayi hai.\n` +
    `Date: ${new Date(appt.date).toLocaleDateString('en-GB')} at ${appt.time}\n` +
    `Dobara book karne ke liye hum se raabta karein.`;
  return sendSMS(appt.phone, body);
}

module.exports = {
  sendSMS,
  sendBookingSMS,
  sendPaymentSMS,
  sendConfirmedSMS,
  sendCancelledSMS,
  normalizePhone
};