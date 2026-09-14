import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// GET /api/notifications
export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('fromUser', 'name avatar')
    .populate('room', 'name');

  res.json({ notifications });
});

// PUT /api/notifications/:id/read
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
  if (!notification) throw new ApiError(404, 'Notification not found');

  notification.read = true;
  await notification.save();

  res.json({ message: 'Marked as read', notification });
});

// PUT /api/notifications/read-all
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
});
