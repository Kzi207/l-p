const admin = require('firebase-admin');
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

const sa = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8'));
const app = admin.initializeApp({ credential: admin.credential.cert(sa) }, 'push-test-runner');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=(.*)/);
const sql = neon(match[1].trim());

async function run() {
  const users = await sql.query("SELECT path, data FROM love_days_records WHERE path LIKE 'users/%'");
  for (const u of users) {
    const tokens = u.data?.fcmTokens;
    if (!Array.isArray(tokens) || tokens.length === 0) continue;
    const name = u.data?.displayName || 'bạn';
    console.log('Sending to', name, `(${tokens.length} tokens)...`);
    const res = await app.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Ting ting! 💌',
        body: 'kzi dzzzzzzz',
      },
      data: {
        title: 'Ting ting! 💌',
        body: 'kzi dzzzzzzz',
        url: '/',
      },
      webpush: {
        notification: {
          title: 'Ting ting! 💌',
          body: 'Thông báo ngầm đã hoạt',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        },
        headers: { Urgency: 'high' },
        fcmOptions: { link: 'https://khanhduyyyy.onrender.com/' },
      },
    });
    console.log(name, 'Success count:', res.successCount, 'Failure count:', res.failureCount);
  }
  process.exit(0);
}

run().catch(console.error);
