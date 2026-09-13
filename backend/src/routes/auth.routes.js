import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, googleAuth, getProfile, updateProfile, deleteAccount } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Limits brute-forcing/credential-stuffing on login and spam-registering
// on register: 10 attempts per IP per 15 minutes. Scoped to just these two
// routes (not the whole /api/auth prefix) so normal profile fetches, which
// can happen far more than 10 times in 15 minutes, are never affected.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', googleAuth);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.delete('/profile', verifyToken, deleteAccount);

export default router;
