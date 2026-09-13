import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Not required for accounts created via Google Sign-In.
      required: function () {
        return !this.googleId;
      },
      // Excluded from query results by default — any query that actually
      // needs to compare it (login) must explicitly opt in with
      // .select('+password'). This means a future endpoint that forgets to
      // strip the password can no longer leak the hash by accident.
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    friendRequests: [
      {
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    personalColumns: {
      type: [
        {
          id: String,
          title: String,
          order: Number,
        },
      ],
      default: [
        { id: 'todo', title: 'To Do', order: 0 },
        { id: 'in-progress', title: 'In Progress', order: 1 },
        { id: 'done', title: 'Done', order: 2 },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
