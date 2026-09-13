import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Task from '../models/Task.js';
import Message from '../models/Message.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// NOTE: this must NOT read process.env.GOOGLE_CLIENT_ID at module-load time.
// ES module imports are hoisted and run before dotenv.config() executes in
// server.js, so a top-level `new OAuth2Client(process.env.GOOGLE_CLIENT_ID)`
// here would permanently capture `undefined`. Instead, create (and cache)
// the client lazily, the first time it's actually needed.
let googleClient = null;
function getGoogleClient() {
  if (googleClient) return googleClient;
  if (!process.env.GOOGLE_CLIENT_ID) return null;
  googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return googleClient;
}

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new ApiError(400, 'User already exists');

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  await User.create({ email, password: hashedPassword });

  res.status(201).json({ message: 'User registered successfully' });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new ApiError(400, 'Invalid email or password');

  if (!user.password) {
    throw new ApiError(400, 'This account uses Google Sign-In. Please continue with Google instead.');
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new ApiError(400, 'Invalid email or password');

  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.json({
    token,
    user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar, bio: user.bio },
  });
});

// POST /api/auth/google
// Body: { credential } — the Google ID token from the Sign In With Google button.
// Verifies the token with Google, then logs in the matching user or creates a
// new one. New (and previously avatar-less) accounts default their profile
// picture to the one on the Google account; anyone can still replace it later
// from the Profile page.
export const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) throw new ApiError(400, 'Missing Google credential');
  const client = getGoogleClient();
  if (!client) {
    throw new ApiError(
      500,
      'Google Sign-In is not configured yet. Set GOOGLE_CLIENT_ID in the server .env file.'
    );
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    throw new ApiError(401, 'Invalid Google credential');
  }

  const { sub: googleId, email, email_verified, name, picture } = payload || {};
  if (!email || !email_verified) throw new ApiError(401, 'Google account email is not verified');

  let user = await User.findOne({ googleId });

  if (!user) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      // An account with this email already exists (e.g. registered with a
      // password) — link the Google identity to it instead of duplicating.
      user.googleId = googleId;
    } else {
      user = new User({
        email: email.toLowerCase(),
        googleId,
        name: name || '',
      });
    }
  }

  // Only default to the Google photo if the user doesn't already have one
  // (so a custom upload is never silently overwritten on a later login).
  if (!user.avatar && picture) {
    user.avatar = picture;
  }

  await user.save();

  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.json({
    token,
    user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar, bio: user.bio },
  });
});

// GET /api/auth/profile
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) throw new ApiError(404, 'User not found');
  res.json(user);
});

// PUT /api/auth/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar, bio, personalColumns } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User not found');

  if (name !== undefined) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;
  if (bio !== undefined) user.bio = bio;
  if (personalColumns !== undefined) user.personalColumns = personalColumns;

  await user.save();

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      personalColumns: user.personalColumns,
    },
  });
});

// DELETE /api/auth/profile — permanently deletes the signed-in user's
// account and cleans up everything that points at it: rooms they own
// (and those rooms' tasks/messages), their membership in other rooms,
// their personal tasks, and any trace of them in other users' friend
// lists / pending friend requests.
export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  // Rooms this user owns are deleted outright, along with their tasks/messages.
  const ownedRooms = await Room.find({ owner: userId });
  const ownedRoomIds = ownedRooms.map((r) => r._id);
  if (ownedRoomIds.length > 0) {
    const io = req.app.get('io');
    if (io) {
      ownedRoomIds.forEach((roomId) => {
        io.to(roomId.toString()).emit('room-deleted', { roomId: roomId.toString() });
      });
    }
    await Promise.all([
      Task.deleteMany({ room: { $in: ownedRoomIds } }),
      Message.deleteMany({ room: { $in: ownedRoomIds } }),
      Room.deleteMany({ _id: { $in: ownedRoomIds } }),
    ]);
  }

  // Remove membership from rooms owned by others.
  await Room.updateMany(
    { 'members.user': userId },
    { $pull: { members: { user: userId } } }
  );

  // Delete this user's personal (non-room) tasks.
  await Task.deleteMany({ user: userId, room: null });

  // Remove this user from everyone else's friends list and pending requests.
  await User.updateMany(
    {},
    {
      $pull: {
        friends: userId,
        friendRequests: { from: userId },
      },
    }
  );

  await user.deleteOne();

  res.json({ message: 'Account deleted successfully' });
});