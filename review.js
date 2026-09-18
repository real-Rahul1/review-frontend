const API = window.APP_CONFIG.API_URL;
const sessionId = new URLSearchParams(location.search).get('id');
const $ = id => document.getElementById(id);

async function load() {
  try {
    if (!sessionId) throw new Error('This link is missing a session id. Please scan the QR code again.');
    const res = await fetch(`${API}/api/public/sessions/${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not load session');

    $('s-image').src = API + data.imageUrl;
    $('s-image').alt = data.name;
    $('s-name').textContent = data.name;
    $('s-desc').textContent = data.description;
    document.title = `Rate: ${data.name}`;

    $('state').hidden = true;
    $('session').hidden = false;
    $('review-form').hidden = false;
  } catch (err) {
    $('state').textContent = err.message;
  }
}

$('review-form').addEventListener('submit', async e => {
  e.preventDefault();
  const checked = document.querySelector('input[name=rating]:checked');
  const error = $('error');
  error.textContent = '';

  const name = $('name').value.trim();
  const rollNo = $('roll').value.trim();
  const department = $('dept').value.trim();
  const year = $('year').value;

  if (!name || !rollNo || !department || !year) {   // reviewer details are compulsory
    error.textContent = 'Please fill in your name, roll number, department and year.';
    return;
  }

  if (!checked) {                       // rating is compulsory
    error.textContent = 'Please choose a star rating before submitting.';
    return;
  }

  $('submit').disabled = true;
  try {
    const res = await fetch(`${API}/api/public/sessions/${encodeURIComponent(sessionId)}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rollNo, department, year: Number(year), rating: Number(checked.value), comment: $('comment').value }) // comment may be empty
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not submit review');
    $('review-form').hidden = true;
    $('thanks').hidden = false;
  } catch (err) {
    error.textContent = err.message;
    $('submit').disabled = false;
  }
});

load();