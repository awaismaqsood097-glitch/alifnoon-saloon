/* ═══════════════ State ═══════════════ */
let TOKEN = localStorage.getItem('alifnoon_admin_token') || null;
let ADMIN_NAME = localStorage.getItem('alifnoon_admin_name') || 'Admin';
let CURRENT_FILTER = 'all';
let ACTIVE_SECTION = 'appointments';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (str = '') =>
  String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

/* ═══════════════ Auth flow ═══════════════ */
const loginView = $('#loginView');
const dashboardView = $('#dashboardView');

function showDashboard() {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  $('#adminName').textContent = ADMIN_NAME;
  refreshAll();
}

function showLogin() {
  dashboardView.classList.add('hidden');
  loginView.classList.remove('hidden');
}

if (TOKEN) showDashboard();
else showLogin();

/* ═══════════════ Login form ═══════════════ */
const loginForm = $('#loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#loginMsg');
    msg.textContent = '';
    msg.className = 'msg';

    const username = $('#username').value.trim();
    const password = $('#password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || 'Login failed');

      TOKEN = data.token;
      ADMIN_NAME = data.username;
      localStorage.setItem('alifnoon_admin_token', TOKEN);
      localStorage.setItem('alifnoon_admin_name', ADMIN_NAME);
      msg.textContent = 'Login successful...';
      msg.classList.add('success');
      setTimeout(showDashboard, 400);
    } catch (err) {
      msg.textContent = err.message;
      msg.classList.add('error');
    }
  });
}

/* ═══════════════ Logout ═══════════════ */
const logoutBtn = $('#logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('alifnoon_admin_token');
    localStorage.removeItem('alifnoon_admin_name');
    TOKEN = null;
    showLogin();
  });
}

/* ═══════════════ API helper ═══════════════ */
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`
});

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) }
  });
  if (res.status === 401) {
    localStorage.removeItem('alifnoon_admin_token');
    TOKEN = null;
    showLogin();
    throw new Error('Session expired. Please log in again.');
  }
  return res.json();
}

/* ═══════════════ Stats ═══════════════ */
async function loadStats() {
  try {
    const data = await apiFetch('/api/appointments/stats/summary');
    if (!data.success) return;
    const s = data.stats;
    $('#statTotal').textContent = s.total;
    $('#statPending').textContent = s.pending;
    $('#statConfirmed').textContent = s.confirmed;
    $('#statCompleted').textContent = s.completed;
    $('#statCancelled').textContent = s.cancelled;
    $('#statPaid').textContent = s.paidCount || 0;
  } catch (e) {
    /* handled */
  }
}

/* ═══════════════ Appointments ═══════════════ */
const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

async function loadAppointments() {
  const tbody = $('#appointmentsBody');
  const empty = $('#aptEmpty');
  if (!tbody) return;
  tbody.innerHTML =
    '<tr><td colspan="7" style="text-align:center;color:#7a6b65">Loading...</td></tr>';

  try {
    const url =
      CURRENT_FILTER === 'all'
        ? '/api/appointments'
        : `/api/appointments?status=${CURRENT_FILTER}`;
    const data = await apiFetch(url);
    if (!data.success || !data.appointments.length) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = data.appointments
      .map((a) => {
        const notesLine = a.notes
          ? `<div style="font-size:.75rem;color:#7a6b65;margin-top:3px">📝 ${esc(a.notes)}</div>`
          : '';
        const emailLine = a.email
          ? `<div style="font-size:.75rem;color:#7a6b65">${esc(a.email)}</div>`
          : '';
        const payBadge =
          a.paymentStatus === 'deposit_paid' || a.paymentStatus === 'paid'
            ? `<span class="badge paid">Paid Rs.${a.amount}</span>`
            : `<span class="badge unpaid">Unpaid</span>`;
        return `
      <tr>
        <td><strong>${esc(a.name)}</strong>${notesLine}</td>
        <td>${esc(a.phone)}${emailLine}</td>
        <td>${esc(a.service)}</td>
        <td>${formatDate(a.date)}<br/>
          <span style="font-size:.78rem;color:#7a6b65">${esc(a.time)}</span>
        </td>
        <td>${payBadge}</td>
        <td><span class="badge ${a.status}">${a.status}</span></td>
        <td>
          <div class="actions">
            ${
              a.status !== 'confirmed' && a.status !== 'completed'
                ? `<button class="confirm" data-act="confirm" data-id="${a._id}">Confirm</button>`
                : ''
            }
            ${
              a.status !== 'completed'
                ? `<button class="complete" data-act="complete" data-id="${a._id}">Complete</button>`
                : ''
            }
            ${
              a.status !== 'cancelled'
                ? `<button class="cancel" data-act="cancel" data-id="${a._id}">Cancel</button>`
                : ''
            }
            <button class="delete" data-act="delete" data-id="${a._id}">Delete</button>
          </div>
        </td>
      </tr>`;
      })
      .join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#c0392b">${e.message}</td></tr>`;
  }
}

/* Appointment actions */
const aptBody = $('#appointmentsBody');
if (aptBody) {
  aptBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;

    try {
      if (act === 'delete') {
        if (!confirm('Delete this appointment permanently?')) return;
        await apiFetch(`/api/appointments/${id}`, { method: 'DELETE' });
      } else {
        const statusMap = {
          confirm: 'confirmed',
          complete: 'completed',
          cancel: 'cancelled'
        };
        await apiFetch(`/api/appointments/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: statusMap[act] })
        });
      }
      loadAppointments();
      loadStats();
    } catch (err) {
      alert(err.message);
    }
  });
}

/* ═══════════════ Reviews ═══════════════ */
async function loadReviews() {
  const tbody = $('#reviewsBody');
  const empty = $('#revEmpty');
  if (!tbody) return;
  tbody.innerHTML =
    '<tr><td colspan="5" style="text-align:center;color:#7a6b65">Loading...</td></tr>';

  try {
    const data = await apiFetch('/api/reviews/all');
    if (!data.success || !data.reviews.length) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = data.reviews
      .map(
        (r) => `
      <tr>
        <td><strong>${esc(r.name)}</strong></td>
        <td>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</td>
        <td style="max-width:340px;font-size:.85rem">${esc(r.message)}</td>
        <td>
          <span class="badge ${r.approved ? 'completed' : 'pending'}">
            ${r.approved ? 'Approved' : 'Pending'}
          </span>
        </td>
        <td>
          <div class="actions">
            <button class="${r.approved ? 'cancel' : 'complete'}"
                    data-act="toggle"
                    data-id="${r._id}"
                    data-approved="${r.approved}">
              ${r.approved ? 'Unapprove' : 'Approve'}
            </button>
            <button class="delete" data-act="delrev" data-id="${r._id}">Delete</button>
          </div>
        </td>
      </tr>`
      )
      .join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#c0392b">${e.message}</td></tr>`;
  }
}

const revBody = $('#reviewsBody');
if (revBody) {
  revBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    try {
      if (act === 'delrev') {
        if (!confirm('Delete this review?')) return;
        await apiFetch(`/api/reviews/${id}`, { method: 'DELETE' });
      } else if (act === 'toggle') {
        const current = btn.dataset.approved === 'true';
        await apiFetch(`/api/reviews/${id}/approve`, {
          method: 'PATCH',
          body: JSON.stringify({ approved: !current })
        });
      }
      loadReviews();
    } catch (err) {
      alert(err.message);
    }
  });
}

/* ═══════════════ Payments ═══════════════ */
async function loadPayments() {
  const tbody = $('#paymentsBody');
  const empty = $('#payEmpty');
  if (!tbody) return;
  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center;color:#7a6b65">Loading...</td></tr>';

  try {
    const data = await apiFetch('/api/payments');
    if (!data.success || !data.payments.length) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = data.payments
      .map(
        (p) => `
      <tr>
        <td>${p.appointmentId ? esc(p.appointmentId.name || '—') : '—'}</td>
        <td>${esc(p.customerPhone || '—')}</td>
        <td>Rs. ${p.amount}</td>
        <td>${esc(p.gateway)}</td>
        <td>
          <span class="badge ${
            p.status === 'succeeded'
              ? 'completed'
              : p.status === 'failed'
              ? 'cancelled'
              : 'pending'
          }">${p.status}</span>
        </td>
        <td>
          <span style="font-size:.75rem;color:#7a6b65">
            ${p.stripePaymentIntentId || p.transactionId || '—'}
          </span>
        </td>
      </tr>`
      )
      .join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#c0392b">${e.message}</td></tr>`;
  }
}

/* ═══════════════ Tabs ═══════════════ */
$$('.tab[data-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tab[data-tab]').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    ACTIVE_SECTION = tab.dataset.tab;
    $('#appointmentsSection').classList.toggle(
      'hidden',
      ACTIVE_SECTION !== 'appointments'
    );
    $('#reviewsSection').classList.toggle(
      'hidden',
      ACTIVE_SECTION !== 'reviews'
    );
    $('#paymentsSection').classList.toggle(
      'hidden',
      ACTIVE_SECTION !== 'payments'
    );
    if (ACTIVE_SECTION === 'payments') loadPayments();
  });
});

$$('.tab[data-status]').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tab[data-status]').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    CURRENT_FILTER = tab.dataset.status;
    loadAppointments();
  });
});

/* ═══════════════ Refresh ═══════════════ */
function refreshAll() {
  loadStats();
  loadAppointments();
  loadReviews();
  if (ACTIVE_SECTION === 'payments') loadPayments();
}

const refreshBtn = $('#refreshBtn');
if (refreshBtn) refreshBtn.addEventListener('click', refreshAll);

/* ═══════════════ Test SMS ═══════════════ */
const testSmsBtn = $('#testSmsBtn');
if (testSmsBtn) {
  testSmsBtn.addEventListener('click', async () => {
    const phone = prompt('Enter phone number (e.g. +923406753402):');
    if (!phone) return;
    try {
      const data = await apiFetch('/api/sms/test', {
        method: 'POST',
        body: JSON.stringify({ phone })
      });
      alert(
        data.success
          ? 'SMS sent (or logged in server console)'
          : 'SMS failed: ' + (data.error || 'unknown')
      );
    } catch (err) {
      alert(err.message);
    }
  });
}