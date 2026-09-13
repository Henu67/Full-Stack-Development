import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    // Optional image/file attachment (uploaded via Cloudinary)
    attachment: {
      url: { type: String },
      type: { type: String, enum: ['image', 'file'], default: undefined },
      name: { type: String },
      size: { type: Number },
      publicId: { type: String },
    },
    // WhatsApp-style "reply to" — points at another message in the same room
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // One active reaction per user, e.g. { user, emoji: '👍' }
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
    // "Delete for me" — hides the message only for these users
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // "Delete for everyone" — message stays as a tombstone for all members
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

messageSchema.pre('validate', function ensureContentOrAttachment(next) {
  if (!this.content && !this.attachment?.url && !this.isDeletedForEveryone) {
    return next(new Error('Message must have content or an attachment'));
  }
  next();
});

export default mongoose.model('Message', messageSchema);