cat > ~/clouddrive/redis_ping.js <<'NODE'
const { createClient } = require('redis');

const host = process.env.REDIS_HOST || process.env.REDISHOST;
const port = Number(process.env.REDIS_PORT || process.env.REDISPORT || 6380);
const password = process.env.REDIS_PASSWORD || process.env.REDISPASSWORD;
const tlsOn = String(process.env.REDIS_TLS || process.env.REDISTLS || 'true').toLowerCase() === 'true';

console.log("REDIS_HOST:", host);
console.log("REDIS_PORT:", port);
console.log("REDIS_TLS:", tlsOn);
console.log("REDIS_PASSWORD_SET:", !!password);

const client = createClient({
  socket: { host, port, tls: tlsOn, rejectUnauthorized: false },
  password
});

client.on('error', (e) => console.error('redis error:', e?.message || e));

(async () => {
  try {
    await client.connect();
    const pong = await client.ping();
    console.log('PING =>', pong);
    await client.quit();
    process.exit(0);
  } catch (e) {
    console.error("PING FAILED:", e?.message || e);
    process.exit(1);
  }
})();
NODE
