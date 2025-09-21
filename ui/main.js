const form = document.getElementById('generate-form');
const urlInput = document.getElementById('url');
const submitBtn = document.getElementById('submit');
const messages = document.getElementById('messages');
const results = document.getElementById('results');
const emailsContainer = document.getElementById('emails');

function setMessage(type, text) {
  messages.innerHTML = '';
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  div.textContent = text;
  messages.appendChild(div);
}

function clearMessage() {
  messages.innerHTML = '';
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? 'Generating…' : 'Generate';
}

function renderEmails(emails) {
  emailsContainer.innerHTML = '';
  if (!emails || emails.length === 0) {
    results.classList.add('hidden');
    return;
  }
  emails.forEach((email, idx) => {
    const card = document.createElement('article');
    card.className = 'email-card';

    const h3 = document.createElement('h3');
    h3.textContent = `Email #${idx + 1}`;

    const pre = document.createElement('pre');
    pre.className = 'email-body';
    pre.textContent = email;

    card.appendChild(h3);
    card.appendChild(pre);
    emailsContainer.appendChild(card);
  });
  results.classList.remove('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  results.classList.add('hidden');

  const url = urlInput.value.trim();
  if (!url) {
    setMessage('warn', 'Please enter a valid URL.');
    return;
  }

  setLoading(true);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.detail || `Request failed with status ${res.status}`;
      throw new Error(msg);
    }

    const data = await res.json();
    renderEmails(data.emails);
    if (!data.emails || data.emails.length === 0) {
      setMessage('warn', 'No emails generated. Try a different job URL.');
    } else {
      setMessage('info', `Generated ${data.emails.length} email(s).`);
    }
  } catch (err) {
    console.error(err);
    setMessage('error', err.message || 'Something went wrong.');
  } finally {
    setLoading(false);
  }
});
