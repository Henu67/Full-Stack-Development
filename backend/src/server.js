import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = createApp();
const httpServer = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
const io = initSocket(httpServer, allowedOrigins);
app.set('io', io); // controllers reach it via req.app.get('io')

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`SynchBoard API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB — server not started.');
    console.error(err.message);
    process.exit(1);
  });