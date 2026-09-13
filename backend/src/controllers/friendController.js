import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// Escapes regex special characters so a search term is always matched as
// literal text, never interpreted as a regex pattern. This closes off both
// ReDoS (a crafted pattern like "(a+)+$" causing catastrophic backtracking)
// and incorrect matches (an unescaped "." matching any character).
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/friends
export const listFriends = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('friends', 'name email avatar')
    .populate('friendRequests.from', 'name email avatar');

  res.json({ friends: user.friends, friendRequests: user.friendRequests });
});

// GET /api/friends/search?query=xxx
export const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query || typeof query !== 'string') return res.json([]);

  const safeQuery = escapeRegex(query.trim()).slice(0, 100);
  if (!safeQuery) return res.json([]);

  const users = await User.find({
    $and: [
      { _id: { $ne: req.user._id } },
      {
        $or: [
          { email: { $regex: safeQuery, $options: 'i' } },
          { name: { $regex: safeQuery, $options: 'i' } },
        ],
      },
    ],
  }).select('name email avatar');

  res.json(users);
});

// POST /api/friends/request
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body;
  if (targetUserId === req.user._id) throw new ApiError(400, 'Cannot add yourself');

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) throw new ApiError(404, 'User not found');

  if (targetUser.friends.some((id) => id.toString() === req.user._id)) {
    throw new ApiError(400, 'Already friends');
  }

  const existingRequest = targetUser.friendRequests.find(
    (r) => r.from.toString() === req.user._id && r.status === 'pending'
  );
  if (existingRequest) throw new ApiError(400, 'Request already sent');

  targetUser.friendRequests.push({ from: req.user._id, status: 'pending' });
  await targetUser.save();

  res.json({ message: 'Friend request sent' });
});

// POST /api/friends/remove
export const removeFriend = asyncHandler(async (req, res) => {
  const { friendId } = req.body;
  if (!friendId) throw new ApiError(400, 'friendId is required');

  const user = await User.findById(req.user._id);
  const friend = await User.findById(friendId);
  if (!friend) throw new ApiError(404, 'User not found');

  user.friends = user.friends.filter((id) => id.toString() !== friendId);
  await user.save();

  friend.friends = friend.friends.filter((id) => id.toString() !== req.user._id.toString());
  await friend.save();

  res.json({ message: 'Friend removed' });
});

// POST /api/friends/respond
export const respondToRequest = asyncHandler(async (req, res) => {
  const { requestId, action } = req.body; // 'accepted' | 'rejected'
  const user = await User.findById(req.user._id);

  const request = user.friendRequests.id(requestId);
  if (!request) throw new ApiError(404, 'Request not found');

  request.status = action;

  if (action === 'accepted') {
    if (!user.friends.some((id) => id.toString() === request.from.toString())) {
      user.friends.push(request.from);
    }
    const sender = await User.findById(request.from);
    if (sender && !sender.friends.some((id) => id.toString() === user._id.toString())) {
      sender.friends.push(user._id);
      await sender.save();
    }
  }

  user.friendRequests.pull(requestId);
  await user.save();

  res.json({ message: `Friend request ${action}` });
});
