import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';

import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import friendRoutes from './routes/friends.js';
import roomRoutes from './routes/rooms.js';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env — try backend dir first, then root (for Vercel compatibility)
dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

const app = express();
const httpServer = createServer(app);
const io = null;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection with caching for serverless
let dbPromise = null;

function connectDB() {
  if (dbPromise) return dbPromise;
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(new Error('MONGODB_URI is not defined'));
  }

  dbPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }).then(() => {
    console.log('Connected to MongoDB successfully!');
  }).catch((err) => {
    dbPromise = null; // Reset so next request retries
    throw err;
  });

  return dbPromise;
}

// Ensure DB is connected before any route handler runs
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err.message);
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

// Health check endpoint (AFTER DB middleware so it triggers connection)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongoUri: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
    jwtSecret: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
    dbState: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/rooms', roomRoutes);

// Make io accessible in routes
app.set('io', io);

// Serve frontend static files only in local dev
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Start server locally
if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  });
}

export default app;
