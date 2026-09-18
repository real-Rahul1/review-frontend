const API = window.APP_CONFIG.API_URL;
const $ = s => document.querySelector(s);
let token = sessionStorage.getItem('adminToken');

/* ---------- helpers ---------- */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  children.forEach(c => node.append(c));   // strings become text nodes (XSS-safe)
  return node;
}
const stars = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const fmtDate = iso => new Date(iso).toLocaleString();

async function api(url, opts = {}) {
  const res = await fetch(API + url, { ...opts, headers: { ...(opts.headers || {}), 'x-admin-token': token || '' } });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) { logout(); throw new Error('Session expired. Please log in again.'); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

/* ---------- login / logout ---------- */
function showView() {
  $('#login-view').hidden = !!token;
  $('#dash-view').hidden = !token;
  $('#logout').hidden = !token;
  if (token) loadSessions();
}
function logout() {
  token = null;
  sessionStorage.removeItem('adminToken');
  showView();
}
$('#logout').addEventListener('click', logout);

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    const res = await fetch(API + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: $('#password').value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    sessionStorage.setItem('adminToken', token);
    $('#password').value = '';
    showView();
  } catch (err) {
    $('#login-error').textContent = err.message || 'Login failed';
  }
});

/* ---------- create session ---------- */
$('#image').addEventListener('change', e => {
  const file = e.target.files[0];
  $('#preview').hidden = !file;
  if (file) $('#preview').src = URL.createObjectURL(file);
});

$('#session-form').addEventListener('submit', async e => {
  e.preventDefault();
  $('#create-error').textContent = '';
  $('#create-btn').disabled = true;
  try {
    const fd = new FormData();
    fd.append('name', $('#name').value);
    fd.append('description', $('#description').value);
    fd.append('image', $('#image').files[0]);
    const data = await api('/api/sessions', { method: 'POST', body: fd });
    e.target.reset();
    $('#preview').hidden = true;
    openQR(data.session.name, data.qr, data.reviewUrl);   // QR appears right after creation
    loadSessions();
  } catch (err) {
    $('#create-error').textContent = err.message;
  } finally {
    $('#create-btn').disabled = false;
  }
});

/* ---------- sessions list ---------- */
async function loadSessions() {
  try {
    const list = await api('/api/sessions');
    const box = $('#sessions');
    box.replaceChildren();
    $('#empty').hidden = list.length > 0;

    list.forEach(s => {
      const rating = s.count
        ? el('span', {}, el('span', { class: 'stars-display' }, stars(s.average)), ` ${s.average} (${s.count} review${s.count === 1 ? '' : 's'})`)
        : el('span', { class: 'muted' }, 'No reviews yet');

      box.append(el('div', { class: 'session-row' },
        el('img', { src: API + s.imageUrl, alt: '' }),
        el('div', { class: 'info' }, el('h3', {}, s.name), rating),
        el('div', { class: 'actions' },
          el('button', { class: 'btn small', onclick: () => showQR(s) }, 'QR code'),
          el('button', { class: 'btn ghost small', onclick: () => showReviews(s.id) }, 'Reviews'),
          el('button', { class: 'btn danger small', onclick: () => removeSession(s) }, 'Delete')
        )
      ));
    });
  } catch (err) { console.error(err); }
}

async function removeSession(s) {
  if (!confirm(`Delete "${s.name}" and all its reviews?`)) return;
  try { await api(`/api/sessions/${s.id}`, { method: 'DELETE' }); loadSessions(); }
  catch (err) { alert(err.message); }
}

/* ---------- QR dialog ---------- */
function openQR(name, qr, url) {
  $('#qr-title').textContent = name;
  $('#qr-img').src = qr;
  $('#qr-link').textContent = url;
  $('#qr-link').href = url;
  $('#qr-download').href = qr;
  $('#qr-download').download = `${name.replace(/[^\w-]+/g, '_')}-qr.png`;
  $('#qr-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(url); $('#qr-copy').textContent = 'Copied!'; }
    catch { prompt('Copy this link:', url); }
    setTimeout(() => ($('#qr-copy').textContent = 'Copy link'), 1500);
  };
  $('#qr-dialog').showModal();
}
async function showQR(s) {
  try { const d = await api(`/api/sessions/${s.id}/qr`); openQR(s.name, d.qr, d.reviewUrl); }
  catch (err) { alert(err.message); }
}

/* ---------- reviews dialog ---------- */
async function showReviews(id) {
  try {
    const d = await api(`/api/sessions/${id}/reviews`);
    $('#rv-title').textContent = d.session.name;
    $('#rv-summary').textContent = d.count
      ? `${d.average} / 5 average from ${d.count} review${d.count === 1 ? '' : 's'}`
      : 'No reviews yet.';
    const list = $('#rv-list');
    list.replaceChildren();
    d.reviews.forEach(r => list.append(el('div', { class: 'rv' },
      el('div', {}, el('span', { class: 'stars-display' }, stars(r.rating)), el('time', {}, fmtDate(r.createdAt))),
      r.comment ? el('p', {}, r.comment) : el('p', { class: 'muted' }, 'No written review')
    )));
    $('#reviews-dialog').showModal();
  } catch (err) { alert(err.message); }
}

document.querySelectorAll('dialog .close').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

showView();
