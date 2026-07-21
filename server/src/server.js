import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB(process.env.MONGO_URI);
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[feastgo-api] listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[feastgo-api] failed to start', err);
  process.exit(1);
});
