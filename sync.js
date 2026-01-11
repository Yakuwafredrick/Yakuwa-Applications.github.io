export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 200,
      body: 'Chat Sync Function Running'
    };
  }

  const { from, messages } = JSON.parse(event.body || '{}');
  if (!from || !Array.isArray(messages)) {
    return { statusCode: 400, body: 'Invalid payload' };
  }

  const target = from === 'AppA' ? 'AppB' : 'AppA';

  const redisURL = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Save messages for target
  for (const msg of messages) {
    await fetch(`${redisURL}/rpush/chat:${target}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`
      },
      body: JSON.stringify([JSON.stringify(msg)])
    });
  }

  // Fetch messages for sender
  const res = await fetch(`${redisURL}/lrange/chat:${from}/0/-1`, {
    headers: {
      Authorization: `Bearer ${redisToken}`
    }
  });

  const stored = await res.json();

  // Clear queue
  await fetch(`${redisURL}/del/chat:${from}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisToken}`
    }
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      incoming: stored.result.map(JSON.parse)
    })
  };
}