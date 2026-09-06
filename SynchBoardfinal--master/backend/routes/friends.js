import express from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get friend list and pending requests
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'name email avatar')
      .populate('friendRequests.from', 'name email avatar');
    
    res.json({
      friends: user.friends,
      friendRequests: user.friendRequests
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search users by email or name
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude self
        {
          $or: [
            { email: { $regex: query, $options: 'i' } },
            { name: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('name email avatar');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send friend request
router.post('/request', verifyToken, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    
    if (targetUserId === req.user._id) {
      return res.status(400).json({ message: "Cannot add yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Check if already friends
    if (targetUser.friends.some(id => id.toString() === req.user._id)) {
      return res.status(400).json({ message: "Already friends" });
    }

    // Check if request already sent
    const existingRequest = targetUser.friendRequests.find(
      req => req.from.toString() === req.user._id && req.status === 'pending'
    );

    if (existingRequest) {
      return res.status(400).json({ message: "Request already sent" });
    }

    targetUser.friendRequests.push({ from: req.user._id, status: 'pending' });
    await targetUser.save();

    res.json({ message: "Friend request sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Accept/Reject friend request
router.post('/respond', verifyToken, async (req, res) => {
  try {
    const { requestId, action } = req.body; // action: 'accepted' or 'rejected'
    const user = await User.findById(req.user._id);

    const request = user.friendRequests.id(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = action;

    if (action === 'accepted') {
      // Add to each other's friend list
      if (!user.friends.some(id => id.toString() === request.from.toString())) {
        user.friends.push(request.from);
      }
      
      const sender = await User.findById(request.from);
      if (sender && !sender.friends.some(id => id.toString() === user._id.toString())) {
        sender.friends.push(user._id);
        await sender.save();
      }
    }

    // Remove the request from array after handling
    user.friendRequests.pull(requestId);
    await user.save();

    res.json({ message: `Friend request ${action}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
