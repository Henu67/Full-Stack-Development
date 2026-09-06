import express from 'express';
import Task from '../models/Task.js';
import Room from '../models/Room.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to check role
async function checkRole(roomId, userId) {
  const room = await Room.findById(roomId);
  if (!room) return null;
  const membership = room.members.find(m => {
    if (m.user) return m.user.toString() === userId.toString();
    return m.toString() === userId.toString();
  });
  if (!membership) return null;
  return membership.role || 'editor'; // Default role for legacy rooms
}

// GET all tasks (Personal or by Room)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.query;
    let query = {};
    if (roomId) {
      const role = await checkRole(roomId, req.user._id);
      if (!role) return res.status(403).json({ message: 'Access denied' });
      query = { room: roomId };
    } else {
      query = { user: req.user._id, room: null };
    }
    
    const tasks = await Task.find(query);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// CREATE a new task
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, color, status, dueDate, room, subtasks } = req.body;
    
    if (room) {
      const role = await checkRole(room, req.user._id);
      if (!role || role === 'viewer') {
        return res.status(403).json({ message: 'Viewers cannot create tasks' });
      }
    }

    const newTask = new Task({
      title,
      description,
      color,
      status: status || 'todo',
      dueDate: dueDate || null,
      subtasks: subtasks || [],
      user: req.user._id,
      room: room || null
    });

    const savedTask = await newTask.save();
    
    // Broadcast if inside a room
    if (room) {
      const io = req.app.get('io');
      if (io) io.to(room.toString()).emit('task-added', savedTask);
    }

    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
});

// UPDATE a task
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.room) {
      const role = await checkRole(task.room, req.user._id);
      if (!role || role === 'viewer') {
        return res.status(403).json({ message: 'Viewers cannot edit tasks' });
      }
    } else if (task.user.toString() !== req.user._id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields
    const { title, description, color, status, dueDate, subtasks } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (color !== undefined) task.color = color;
    if (status !== undefined) task.status = status;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (subtasks !== undefined) task.subtasks = subtasks;

    const updatedTask = await task.save();
    
    if (task.room) {
      const io = req.app.get('io');
      if (io) {
        io.to(task.room.toString()).emit('task-updated', updatedTask);
      }
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
});

// DELETE a task
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (task.room) {
      const role = await checkRole(task.room, req.user._id);
      if (!role || role === 'viewer') {
        return res.status(403).json({ message: 'Viewers cannot delete tasks' });
      }
    } else if (task.user.toString() !== req.user._id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Task.findOneAndDelete({ _id: req.params.id });
    
    if (task.room) {
      const io = req.app.get('io');
      if (io) {
        io.to(task.room.toString()).emit('task-deleted', task._id);
      }
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
});

export default router;
