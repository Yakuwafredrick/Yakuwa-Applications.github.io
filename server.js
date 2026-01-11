import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

/*
  Temporary message store
  (Use database later if you want)
*/
const MESSAGE_STORE = {
  AppA: [],
  AppB: []
};

/* ============================
   SYNC ENDPOINT
   POST /sync
============================ */
app.post('/sync', (req, res) => {
  const { from, messages } = req.body;

  if (!from || !messages) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const target = from === 'AppA' ? 'AppB' : 'AppA';

  // Store incoming messages for target
  messages.forEach(msg => {
    MESSAGE_STORE[target].push({
      id: msg.id,
      text: msg.text,
      time: msg.time
    });
  });

  // Get messages waiting for sender
  const outgoing = MESSAGE_STORE[from];
  MESSAGE_STORE[from] = []; // clear once delivered

  res.json({
    incoming: outgoing
  });
});

/* ============================
   HEALTH CHECK
============================ */
app.get('/', (_, res) => {
  res.send('Chat Sync Server is running');
});

/* ============================
   START SERVER
============================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sync server running on port ${PORT}`);
});
