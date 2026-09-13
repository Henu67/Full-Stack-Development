import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import helmet from 'helmet';

import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import roomRoutes from './routes/room.routes.js';
import friendRoutes from './routes/friend.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import { connectDB } from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Sets a bundle of standard security headers (removes X-Powered-By,
  // adds X-Content-Type-Options, X-Frame-Options, etc.). Pure response
  // headers — doesn't change any route behavior.
  app.use(helmet());

  const allowedOrigins = (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
  app.use(express.json());

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Make sure a DB connection exists before any route handler runs. This
  // also lets the API work correctly if it's ever deployed to a serverless
  // platform, where each request may hit a fresh function instance.
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      res.status(500).json({ message: 'Database connection failed', error: err.message });
    }
  });

  // Public — deliberately reveals nothing beyond "is this server up".
  // The old version also returned whether MONGODB_URI/JWT_SECRET were set
  // and the live DB connection state, which is free recon info for anyone
  // scanning the site with no auth required. Use the dbState()/env checks
  // yourself via server logs or an authenticated admin route if you need
  // that detail while debugging a deploy.
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/uploads', uploadRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export { mongoose };