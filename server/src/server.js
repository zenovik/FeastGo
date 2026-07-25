import 'dotenv/config';
import http from 'http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './realtime/socket.js';
import { startNotificationScheduler } from './jobs/notificationScheduler.js';

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB(process.env.MONGO_URI);
  const app = createApp();
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  startNotificationScheduler();
  httpServer.listen(PORT, () => {
    console.log(`[feastgo-api] listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[feastgo-api] failed to start', err);
  process.exit(1);
});
