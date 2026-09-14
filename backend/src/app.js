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
import notificationRoutes from './routes/notification.routes.js';
import { connectDB } from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  const allowedOrigins = (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
  app.use(express.json());

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      res.status(500).json({ message: 'Database connection failed', error: err.message });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export { mongoose };