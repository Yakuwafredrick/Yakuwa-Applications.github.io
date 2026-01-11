/*************************************************
 * CHAT APP B – OFFLINE FIRST + AUTO SYNC
 *************************************************/

const APP_ID = 'AppB';
const TARGET_APP_ID = 'AppA';
const SERVER_URL = 'https://yourserver.com/sync'; // 🔴 CHANGE THIS

// Storage keys
const HISTORY_KEY = `${APP_ID}_history`;
const OUTBOX_KEY = `${APP_ID}_outbox`;

// DOM
const messagesDisplay = document.getElementById('messagesDisplay');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

/* =========================
   UI FUNCTIONS
========================= */
function displayMessage(text, sender) {
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.textContent = text;
  messagesDisplay.appendChild(div);
  messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
}

/* =========================
   LOCAL STORAGE
========================= */
function loadHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  history.forEach(m => displayMessage(m.text, m.sender));
}

function saveHistory(text, sender) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  history.push({ text, sender, time: Date.now() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function queueMessage(text) {
  const outbox = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  outbox.push({
    id: crypto.randomUUID(),
    text,
    to: TARGET_APP_ID,
    sent: false,
    time: Date.now()
  });
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
}

/* =========================
   SEND MESSAGE (OFFLINE)
========================= */
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  displayMessage(text, 'sent');
  saveHistory(text, 'sent');
  queueMessage(text);

  messageInput.value = '';
}

/* =========================
   SYNC ENGINE
========================= */
async function syncMessages() {
  if (!navigator.onLine) return;

  const outbox = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  const pending = outbox.filter(m => !m.sent);
  if (!pending.length) return;

  try {
    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: APP_ID,
        messages: pending
      })
    });

    const data = await res.json();

    pending.forEach(m => m.sent = true);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));

    if (data.incoming) {
      data.incoming.forEach(m => {
        displayMessage(m.text, 'received');
        saveHistory(m.text, 'received');
      });
    }

  } catch (e) {
    console.log('Sync failed, will retry');
  }
}

/* =========================
   EVENTS
========================= */
sendButton.onclick = sendMessage;
messageInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});

window.addEventListener('online', syncMessages);
setInterval(syncMessages, 5000);

// Start
loadHistory();
