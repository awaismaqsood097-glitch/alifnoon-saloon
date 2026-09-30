/* ═══════════════ Config ═══════════════ */
const API = '';
const WHATSAPP_NUMBER = '923406753402'; // Change to your WhatsApp number in international format

/* ═══════════════ Helpers ═══════════════ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (str = '') =>
  String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

/* ═══════════════ Navbar ═══════════════ */
const navToggle = $('#navToggle');
const navLinks = $('#navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('active'));
  $$('.nav-links a').forEach((a) =>
    a.addEventListener('click', () => navLinks.classList.remove('active'))
  );
}

/* ═══════════════ Year ═══════════════ */
const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ═══════════════ Min booking date ═══════════════ */
const dateInput = $('#date');
if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

/* ═══════════════ Payment state ═══════════════ */
let stripe = null;
let elements = null;
let paymentElement = null;
let paymentConfig = { gateway: 'stripe', depositAmount: 2000 };

async function loadPaymentConfig() {
  try {
    const res = await fetch(`${API}/api/payments/config`);
    const data = await res.json();
    if (data.success) {
      paymentConfig = data;
      const depAmt = $('#depositAmt');
      const modAmt = $('#modalAmount');
      if (depAmt) depAmt.textContent = data.depositAmount;
      if (modAmt) modAmt.textContent = data.depositAmount;
      if (data.publishableKey && data.gateway === 'stripe' && window.Stripe) {
        stripe = Stripe(data.publishableKey);
      }
    }
  } catch (e) {
    console.warn('Payment config failed', e);
  }
}
loadPaymentConfig();

/* ═══════════════ Services ═══════════════ */
const SERVICE_ICONS = {
  haircut: 'fa-scissors',
  coloring: 'fa-palette',
  treatment: 'fa-spa',
  bridal: 'fa-crown',
  party: 'fa-star',
  facial: 'fa-face-smile',
  mani: 'fa-hand-sparkles',
  waxing: 'fa-leaf',
  mehndi: 'fa-feather',
  package: 'fa-gem'
};

async function loadServices() {
  const grid = $('#servicesGrid');
  if (!grid) return;
  try {
    const res = await fetch(`${API}/api/services`);
    const data = await res.json();
    if (!data.success) throw new Error('Failed');
    grid.innerHTML = data.services
      .map(
        (s) => `
      <article class="service-card">
        <div class="service-icon">
          <i class="fa-solid ${SERVICE_ICONS[s.id] || 'fa-sparkles'}"></i>
        </div>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.desc)}</p>
        <div class="service-meta">
          <strong>${esc(s.price)}</strong>
          <span><i class="fa-regular fa-clock"></i> ${esc(s.duration)}</span>
        </div>
      </article>`
      )
      .join('');
  } catch (e) {
    grid.innerHTML =
      '<p style="text-align:center;grid-column:1/-1;color:#c0392b">Could not load services.</p>';
  }
}

/* ═══════════════ Reviews ═══════════════ */
const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

async function loadReviews() {
  const grid = $('#reviewsGrid');
  if (!grid) return;
  try {
    const res = await fetch(`${API}/api/reviews`);
    const data = await res.json();
    if (!data.success || !data.reviews.length) {
      grid.innerHTML =
        '<p style="text-align:center;grid-column:1/-1;color:#7a6b65">Be the first to leave a review!</p>';
      return;
    }
    grid.innerHTML = data.reviews
      .map(
        (r) => `
      <article class="review-card">
        <div class="review-stars">${stars(r.rating)}</div>
        <p>${esc(r.message)}</p>
        <div class="review-author">— ${esc(r.name)}</div>
        ${r.service ? `<div class="review-service">${esc(r.service)}</div>` : ''}
      </article>`
      )
      .join('');
  } catch (e) {
    grid.innerHTML =
      '<p style="text-align:center;grid-column:1/-1">Reviews unavailable.</p>';
  }
}

/* ═══════════════ Booking + Payment ═══════════════ */
const bookingForm = $('#bookingForm');
const paymentModal = $('#paymentModal');
let currentAppointmentId = null;

if (bookingForm) {
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#bookBtn');
    const msg = $('#formMsg');
    msg.textContent = '';
    msg.className = 'form-msg';

    const payload = Object.fromEntries(new FormData(bookingForm).entries());
    const payOnline = $('#payOnline') ? $('#payOnline').checked : false;

    if (
      !payload.name ||
      !payload.phone ||
      !payload.service ||
      !payload.date ||
      !payload.time
    ) {
      msg.textContent = 'Please fill all required fields.';
      msg.className = 'form-msg error';
      return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = 'Booking...';

    try {
      /* Step 1: Create appointment */
      const res = await fetch(`${API}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || 'Booking failed');

      currentAppointmentId = data.appointment._id;
      msg.textContent = '✅ Appointment created! SMS confirmation sent.';
      msg.className = 'form-msg success';

      /* Step 2: If online payment selected, open modal */
      if (payOnline && paymentConfig.gateway === 'stripe' && stripe) {
        setTimeout(() => openPaymentModal(), 600);
      } else {
        offerWhatsApp(payload);
      }
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'form-msg error';
    } finally {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Confirm Booking';
    }
  });
}

/* ─── Stripe Modal ─── */
async function openPaymentModal() {
  try {
    paymentModal.classList.remove('hidden');
    $('#payMsg').textContent = '';
    $('#payMsg').className = 'form-msg';

    const res = await fetch(`${API}/api/payments/create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: currentAppointmentId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Payment init failed');

    elements = stripe.elements({ clientSecret: data.clientSecret });
    paymentElement = elements.create('payment');
    paymentElement.mount('#paymentElement');
  } catch (err) {
    $('#payMsg').textContent = err.message;
    $('#payMsg').className = 'form-msg error';
  }
}

const modalClose = $('#modalClose');
if (modalClose) {
  modalClose.addEventListener('click', () => {
    paymentModal.classList.add('hidden');
    if (paymentElement) {
      paymentElement.destroy();
      paymentElement = null;
    }
  });
}

const payBtn = $('#payBtn');
if (payBtn) {
  payBtn.addEventListener('click', async () => {
    const btn = payBtn;
    const msg = $('#payMsg');
    msg.textContent = '';
    msg.className = 'form-msg';
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/booking-success.html'
        },
        redirect: 'if_required'
      });

      if (error) {
        msg.textContent = error.message;
        msg.className = 'form-msg error';
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        await fetch(`${API}/api/payments/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id })
        });
        msg.textContent = '✅ Payment successful! SMS sent.';
        msg.className = 'form-msg success';
        setTimeout(() => {
          window.location.href = '/booking-success.html';
        }, 1200);
      }
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'form-msg error';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock"></i> Pay Now';
    }
  });
}

/* ─── WhatsApp prompt ─── */
function offerWhatsApp(payload) {
  const waMsg = encodeURIComponent(
    `Assalam-o-Alaikum ALIFNOON SALON!\n\nI've just booked an appointment.\n\nName: ${payload.name}\nPhone: ${payload.phone}\nService: ${payload.service}\nDate: ${payload.date}\nTime: ${payload.time}${payload.notes ? `\nNotes: ${payload.notes}` : ''}`
  );
  setTimeout(() => {
    if (
      confirm(
        'Your appointment is booked! Open WhatsApp to send confirmation to the salon?'
      )
    ) {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`, '_blank');
    }
  }, 500);
}

/* ═══════════════ Review form ═══════════════ */
const reviewForm = $('#reviewForm');
if (reviewForm) {
  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#reviewMsg');
    msg.textContent = '';
    msg.className = 'form-msg';

    const payload = Object.fromEntries(new FormData(reviewForm).entries());
    payload.rating = Number(payload.rating);

    try {
      const res = await fetch(`${API}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed');
      msg.textContent = '✅ ' + data.message;
      msg.className = 'form-msg success';
      reviewForm.reset();
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'form-msg error';
    }
  });
}

/* ═══════════════ Init ═══════════════ */
loadServices();
loadReviews();