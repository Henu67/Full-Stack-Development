import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: 'yellow',
  },
  dueDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    default: 'todo',
  },
  subtasks: [{
    title: { type: String, required: true },
    completed: { type: Boolean, default: false }
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
  }
}, { timestamps: true });

export default mongoose.model('Task', taskSchema);
