import express from 'express';
import { listFriends, searchUsers, sendFriendRequest, respondToRequest, removeFriend } from '../controllers/friendController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', listFriends);
router.get('/search', searchUsers);
router.post('/request', sendFriendRequest);
router.post('/respond', respondToRequest);
router.post('/remove', removeFriend);

export default router;
