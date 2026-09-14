import crypto from 'crypto';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Notification from '../models/Notification.js';

function isMember(room, userId) {
  return room.members.some((m) => m.user && m.user._id ? m.user._id.toString() === userId.toString() : m.user?.toString() === userId.toString());
}

function myMembership(room, userId) {
  return room.members.find((m) => (m.user._id ? m.user._id.toString() : m.user.toString()) === userId.toString());
}

// POST /api/rooms/create
export const createRoom = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, 'Room name is required');

  const room = await Room.create({
    name,
    description,
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'owner' }],
  });

  await room.populate('members.user', 'name email avatar');
  res.status(201).json(room);
});

// GET /api/rooms
export const getRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({ 'members.user': req.user._id }).populate('members.user', 'name email avatar');

  // Backfill inviteCode for any legacy rooms created before that field existed
  for (const room of rooms) {
    if (!room.inviteCode) {
      room.inviteCode = crypto.randomBytes(4).toString('hex');
      await room.save();
    }
  }

  res.json(rooms);
});

// GET /api/rooms/:id
export const getRoomById = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate('members.user', 'name email avatar');
  if (!room) throw new ApiError(404, 'Room not found');
  if (!isMember(room, req.user._id)) throw new ApiError(403, 'Access denied');
  res.json(room);
});

// PUT /api/rooms/:id  (owner only — rename/redescribe a room)
export const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found');
  if (room.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the room owner can edit this room');
  }

  const { name, description } = req.body;
  if (name !== undefined) {
    if (!name.trim()) throw new ApiError(400, 'Room name is required');
    room.name = name;
  }
  if (description !== undefined) room.description = description;

  await room.save();
  await room.populate('members.user', 'name email avatar');
  res.json(room);
});

// DELETE /api/rooms/:id  (owner only — cascades to the room's tasks & messages)
export const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found');
  if (room.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the room owner can delete this room');
  }

  await Promise.all([
    Task.deleteMany({ room: room._id }),
    Message.deleteMany({ room: room._id }),
    room.deleteOne(),
  ]);

  const io = req.app.get('io');
  if (io) io.to(room._id.toString()).emit('room-deleted', { roomId: room._id.toString() });

  res.json({ message: 'Room deleted successfully' });
});

// POST /api/rooms/:id/leave  (any non-owner member — owners must delete or
// transfer the room instead, so ownership never dangles)
export const leaveRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found');
  if (!isMember(room, req.user._id)) throw new ApiError(403, 'You are not a member of this room');
  if (room.owner.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'Room owners cannot leave — delete the room instead');
  }

  room.members = room.members.filter(
    (m) => (m.user._id ? m.user._id.toString() : m.user.toString()) !== req.user._id.toString()
  );
  await room.save();

  res.json({ message: 'Left room successfully' });
});

// POST /api/rooms/join
export const joinRoom = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;

  // inviteCode must be a plain, non-empty string. Without this check, a
  // request like { inviteCode: { "$ne": null } } would be interpreted by
  // MongoDB as a query operator instead of a literal value, matching the
  // first room in the whole collection and letting anyone join any room
  // without ever knowing its real invite code.
  if (typeof inviteCode !== 'string' || !inviteCode.trim()) {
    throw new ApiError(400, 'A valid invite code is required');
  }

  const room = await Room.findOne({ inviteCode: inviteCode.trim() });
  if (!room) throw new ApiError(404, 'Invalid invite code');

  const alreadyMember = room.members.some((m) => m.user.toString() === req.user._id);
  if (alreadyMember) {
    return res.status(400).json({ message: 'You are already in this room', roomId: room._id });
  }

  room.members.push({ user: req.user._id, role: 'editor' });
  await room.save();
  await room.populate('members.user', 'name email avatar');

  res.json({ message: 'Joined room successfully!', room });
});

// PUT /api/rooms/:id/columns
export const updateColumns = asyncHandler(async (req, res) => {
  const { columns } = req.body;
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found');

  const membership = room.members.find((m) => m.user.toString() === req.user._id);
  if (!membership) throw new ApiError(403, 'Access denied');
  if (membership.role === 'viewer') throw new ApiError(403, 'Viewers cannot update columns');

  room.columns = columns;
  await room.save();

  res.json({ message: 'Columns updated successfully', columns: room.columns });
});

// POST /api/rooms/:id/invite
export const inviteToRoom = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body;
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found');

  const membership = room.members.find((m) => m.user.toString() === req.user._id);
  if (!membership) throw new ApiError(403, 'Not a member of this room');
  if (membership.role === 'viewer') throw new ApiError(403, 'Viewers cannot invite members');

  if (room.members.some((m) => m.user.toString() === targetUserId)) {
    throw new ApiError(400, 'User already in room');
  }

  room.members.push({ user: targetUserId, role: 'editor' });
  await room.save();

  await Notification.create({
    recipient: targetUserId,
    type: 'room-invite',
    message: `${req.user.name || 'Someone'} added you to "${room.name}"`,
    room: room._id,
    fromUser: req.user._id,
  });

  res.json({ message: 'User invited successfully', room });
});

// Message-related handlers (getMessages, postMessage, reactions, delete,
// pin/unpin) now live in messageController.js alongside Socket.io broadcasts.