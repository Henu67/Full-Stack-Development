import express from 'express';
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
  updateColumns,
  inviteToRoom,
} from '../controllers/roomController.js';
import {
  getMessages,
  postMessage,
  reactToMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
} from '../controllers/messageController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.post('/create', createRoom);
router.get('/', getRooms);
router.post('/join', joinRoom);
router.get('/:id', getRoomById);
router.put('/:id', updateRoom); // owner only
router.delete('/:id', deleteRoom); // owner only
router.post('/:id/leave', leaveRoom); // members only, not the owner
router.put('/:id/columns', updateColumns);
router.post('/:id/invite', inviteToRoom);

router.get('/:id/messages', getMessages);
router.post('/:id/messages', postMessage);
router.put('/:id/messages/:msgId/react', reactToMessage);
router.delete('/:id/messages/:msgId', deleteMessage);
router.put('/:id/messages/:msgId/pin', pinMessage);
router.put('/:id/messages/:msgId/unpin', unpinMessage);

export default router;