/*************************************************
 * CHAT APP A – OFFLINE FIRST + AUTO SYNC (FINAL)
 *************************************************/

const APP_ID = 'AppA';
const TARGET_APP_ID = 'AppB';
const SERVER_URL = 'https://chat-sync-server.onrender.com/sync';

// Storage keys
const HISTORY_KEY = `${APP_ID}_history`;
const OUTBOX_KEY = `${APP_ID}_outbox`;
const LAST_SYNC_KEY = `${APP_ID}_last_sync`;

// DOM
const messagesDisplay = document.getElementById('messagesDisplay');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

/* =========================
   UI
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
    from: APP_ID,
    to: TARGET_APP_ID,
    time: Date.now(),
    sent: false
  });
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
}

/* =========================
   SEND MESSAGE (OFFLINE SAFE)
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

  try {
    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: APP_ID,
        to: TARGET_APP_ID,
        lastSync: localStorage.getItem(LAST_SYNC_KEY),
        outgoing: pending
      })
    });

    const data = await res.json();

    // Mark sent messages
    pending.forEach(m => (m.sent = true));
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));

    // Receive new messages
    if (Array.isArray(data.incoming)) {
      data.incoming.forEach(m => {
        displayMessage(m.text, 'received');
        saveHistory(m.text, 'received');
      });
    }

    localStorage.setItem(LAST_SYNC_KEY, Date.now());

  } catch {
    console.log('Sync failed – offline or server asleep');
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
setInterval(syncMessages, 4000);

// Start
loadHistory();
syncMessages();
