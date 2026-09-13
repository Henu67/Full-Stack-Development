import Room from '../models/Room.js';
import Message from '../models/Message.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

function isMember(room, userId) {
  return room.members.some((m) => (m.user._id ? m.user._id.toString() : m.user.toString()) === userId.toString());
}

function getRoleOf(room, userId) {
  const membership = room.members.find(
    (m) => (m.user._id ? m.user._id.toString() : m.user.toString()) === userId.toString()
  );
  return membership ? membership.role || 'editor' : null;
}

async function assertMember(roomId, userId) {
  const room = await Room.findById(roomId);
  if (!room || !isMember(room, userId)) throw new ApiError(403, 'Access denied');
  return room;
}

async function populateMessage(message) {
  await message.populate('sender', 'name avatar');
  await message.populate({
    path: 'replyTo',
    select: 'content attachment sender isDeletedForEveryone',
    populate: { path: 'sender', select: 'name avatar' },
  });
  await message.populate('reactions.user', 'name avatar');
  return message;
}

function emitToRoom(req, roomId, event, payload) {
  const io = req.app.get('io');
  if (io) io.to(roomId.toString()).emit(event, payload);
}

// GET /api/rooms/:id/messages
export const getMessages = asyncHandler(async (req, res) => {
  await assertMember(req.params.id, req.user._id);

  const messages = await Message.find({
    room: req.params.id,
    deletedFor: { $ne: req.user._id },
  })
    .populate('sender', 'name avatar')
    .populate({
      path: 'replyTo',
      select: 'content attachment sender isDeletedForEveryone',
      populate: { path: 'sender', select: 'name avatar' },
    })
    .populate('reactions.user', 'name avatar')
    .sort({ createdAt: 1 })
    .limit(200);

  res.json(messages);
});

// POST /api/rooms/:id/messages
export const postMessage = asyncHandler(async (req, res) => {
  await assertMember(req.params.id, req.user._id);

  const { content, attachment, replyTo } = req.body;
  if (!content?.trim() && !attachment?.url) {
    throw new ApiError(400, 'Message content or an attachment is required');
  }

  if (replyTo) {
    const original = await Message.findOne({ _id: replyTo, room: req.params.id });
    if (!original) throw new ApiError(400, 'The message being replied to no longer exists');
  }

  const message = await Message.create({
    room: req.params.id,
    sender: req.user._id,
    content: content?.trim() || '',
    attachment: attachment?.url
      ? {
          url: attachment.url,
          type: attachment.type === 'image' ? 'image' : 'file',
          name: attachment.name,
          size: attachment.size,
          publicId: attachment.publicId,
        }
      : undefined,
    replyTo: replyTo || null,
  });

  await populateMessage(message);
  emitToRoom(req, req.params.id, 'receive-message', message);

  res.status(201).json(message);
});

// PUT /api/rooms/:id/messages/:msgId/react
export const reactToMessage = asyncHandler(async (req, res) => {
  await assertMember(req.params.id, req.user._id);
  const { emoji } = req.body;
  if (!emoji) throw new ApiError(400, 'An emoji is required');

  const message = await Message.findOne({ _id: req.params.msgId, room: req.params.id });
  if (!message) throw new ApiError(404, 'Message not found');

  const existingIndex = message.reactions.findIndex((r) => r.user.toString() === req.user._id.toString());
  if (existingIndex !== -1 && message.reactions[existingIndex].emoji === emoji) {
    // Tapping the same emoji again removes your reaction
    message.reactions.splice(existingIndex, 1);
  } else if (existingIndex !== -1) {
    // Switch to the newly picked emoji
    message.reactions[existingIndex].emoji = emoji;
  } else {
    message.reactions.push({ user: req.user._id, emoji });
  }

  await message.save();
  await populateMessage(message);
  emitToRoom(req, req.params.id, 'message-updated', message);

  res.json(message);
});

// DELETE /api/rooms/:id/messages/:msgId
// body: { forEveryone: boolean }
export const deleteMessage = asyncHandler(async (req, res) => {
  await assertMember(req.params.id, req.user._id);
  const message = await Message.findOne({ _id: req.params.msgId, room: req.params.id });
  if (!message) throw new ApiError(404, 'Message not found');

  const forEveryone = !!req.body.forEveryone;

  if (forEveryone) {
    if (message.sender.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only delete your own messages for everyone');
    }
    message.isDeletedForEveryone = true;
    message.content = '';
    message.attachment = undefined;
    message.reactions = [];
    message.pinned = false;
    message.pinnedAt = null;
    await message.save();
    await populateMessage(message);
    emitToRoom(req, req.params.id, 'message-updated', message);
    return res.json(message);
  }

  // Delete for me — hide only for the requesting user
  if (!message.deletedFor.some((id) => id.toString() === req.user._id.toString())) {
    message.deletedFor.push(req.user._id);
    await message.save();
  }
  res.json({ message: 'Message deleted for you' });
});

// PUT /api/rooms/:id/messages/:msgId/pin
export const pinMessage = asyncHandler(async (req, res) => {
  const room = await assertMember(req.params.id, req.user._id);
  if (getRoleOf(room, req.user._id) === 'viewer') throw new ApiError(403, 'Viewers cannot pin messages');

  const message = await Message.findOne({ _id: req.params.msgId, room: req.params.id });
  if (!message) throw new ApiError(404, 'Message not found');
  if (message.isDeletedForEveryone) throw new ApiError(400, 'Cannot pin a deleted message');

  message.pinned = true;
  message.pinnedAt = new Date();
  await message.save();
  await populateMessage(message);
  emitToRoom(req, req.params.id, 'message-updated', message);

  res.json(message);
});

// PUT /api/rooms/:id/messages/:msgId/unpin
export const unpinMessage = asyncHandler(async (req, res) => {
  const room = await assertMember(req.params.id, req.user._id);
  if (getRoleOf(room, req.user._id) === 'viewer') throw new ApiError(403, 'Viewers cannot unpin messages');

  const message = await Message.findOne({ _id: req.params.msgId, room: req.params.id });
  if (!message) throw new ApiError(404, 'Message not found');

  message.pinned = false;
  message.pinnedAt = null;
  await message.save();
  await populateMessage(message);
  emitToRoom(req, req.params.id, 'message-updated', message);

  res.json(message);
});