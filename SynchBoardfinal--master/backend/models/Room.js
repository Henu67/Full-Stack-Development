import mongoose from 'mongoose';
import crypto from 'crypto';

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  inviteCode: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(4).toString('hex'),
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' }
  }],
  columns: {
    type: [{
      id: String,
      title: String,
      order: Number
    }],
    default: [
      { id: 'todo', title: 'To Do', order: 0 },
      { id: 'in-progress', title: 'In Progress', order: 1 },
      { id: 'done', title: 'Done', order: 2 }
    ]
  },
}, { timestamps: true });

export default mongoose.model('Room', roomSchema);
