import Task from '../models/Task.js';
import Room from '../models/Room.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// Returns the caller's role in a room, or null if they aren't a member.
async function getRole(roomId, userId) {
  const room = await Room.findById(roomId);
  if (!room) return null;
  const membership = room.members.find((m) => (m.user ? m.user.toString() : m.toString()) === userId.toString());
  return membership ? membership.role || 'editor' : null;
}

// GET /api/tasks?roomId=xxx  (personal tasks if roomId omitted)
export const getTasks = asyncHandler(async (req, res) => {
  const { roomId } = req.query;
  let query;

  if (roomId) {
    const role = await getRole(roomId, req.user._id);
    if (!role) throw new ApiError(403, 'Access denied');
    query = { room: roomId };
  } else {
    query = { user: req.user._id, room: null };
  }

  const tasks = await Task.find(query).sort({ createdAt: 1 });
  res.json(tasks);
});

// POST /api/tasks
export const createTask = asyncHandler(async (req, res) => {
  const { title, description, color, status, dueDate, room, subtasks } = req.body;
  if (!title) throw new ApiError(400, 'Title is required');

  if (room) {
    const role = await getRole(room, req.user._id);
    if (!role || role === 'viewer') throw new ApiError(403, 'Viewers cannot create tasks');
  }

  const task = await Task.create({
    title,
    description,
    color,
    status: status || 'todo',
    dueDate: dueDate || null,
    subtasks: subtasks || [],
    user: req.user._id,
    room: room || null,
  });

  res.status(201).json(task);
});

// A task's content can only be changed while it's still in the "To Do"
// column. Moving it (a status-only update, e.g. via drag & drop) is a
// separate action and isn't gated by this rule.
const CONTENT_FIELDS = ['title', 'description', 'color', 'dueDate', 'subtasks'];

// PUT /api/tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');

  if (task.room) {
    const role = await getRole(task.room, req.user._id);
    if (!role || role === 'viewer') throw new ApiError(403, 'Viewers cannot edit tasks');
  } else if (task.user.toString() !== req.user._id) {
    throw new ApiError(403, 'Access denied');
  }

  const { title, description, color, status, dueDate, subtasks } = req.body;
  const isContentEdit = CONTENT_FIELDS.some((field) => req.body[field] !== undefined);

  if (isContentEdit && task.status !== 'todo') {
    throw new ApiError(403, 'Tasks can only be edited while they are in the To Do column');
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (color !== undefined) task.color = color;
  if (status !== undefined) task.status = status;
  if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
  if (subtasks !== undefined) task.subtasks = subtasks;

  const updatedTask = await task.save();
  res.json(updatedTask);
});

// DELETE /api/tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');

  if (task.room) {
    const role = await getRole(task.room, req.user._id);
    if (!role || role === 'viewer') throw new ApiError(403, 'Viewers cannot delete tasks');
  } else if (task.user.toString() !== req.user._id) {
    throw new ApiError(403, 'Access denied');
  }

  if (task.status === 'in-progress') {
    throw new ApiError(403, 'Tasks cannot be deleted while they are In Progress');
  }

  await task.deleteOne();
  res.json({ message: 'Task deleted successfully' });
});