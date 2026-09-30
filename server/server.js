require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

/* ═══════════════ Security & Middleware ═══════════════ */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));

/* ═══════════════ Rate Limiting ═══════════════ */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

/* ═══════════════ Stripe Webhook (raw body) ═══════════════
   IMPORTANT: Ye express.json() se PEHLE hona chahiye
*/
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

/* ═══════════════ JSON Parser ═══════════════ */
app.use(express.json({ limit: '1mb' }));

/* ═══════════════ API Rate Limiter ═══════════════ */
app.use('/api', apiLimiter);

/* ═══════════════ Serve Frontend (public folder) ═══════════════ */
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ═══════════════ API Routes ═══════════════ */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/reviews', require('./routes/review'));
app.use('/api/services', require('./routes/services'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/sms', require('./routes/sms'));

/* ═══════════════ Health Check ═══════════════ */
app.get('/api/health', (req, res) =>
  res.json({ success: true, status: 'ok', time: new Date().toISOString() })
);

/* ═══════════════ SPA Fallback ═══════════════
   Koi bhi non-API route → index.html serve karein
*/
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

/* ═══════════════ Error Handler ═══════════════ */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

/* ═══════════════ Boot Server ═══════════════ */
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () =>
      console.log(`🚀 ALIFNOON SALON → http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });