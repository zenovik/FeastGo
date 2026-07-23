import Notification from '../models/Notification.js';
import User from '../models/User.js';
import RestaurantOwner from '../models/RestaurantOwner.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { ApiError } from '../utils/ApiError.js';
import { logAdminAction } from '../utils/auditLog.js';

const RECIPIENT_MODELS = {
  customer: [{ role: 'customer', Model: User, filter: { role: 'user' } }],
  seller: [{ role: 'seller', Model: RestaurantOwner, filter: {} }],
  delivery: [{ role: 'delivery', Model: DeliveryPartner, filter: {} }],
};
RECIPIENT_MODELS.all = [...RECIPIENT_MODELS.customer, ...RECIPIENT_MODELS.seller, ...RECIPIENT_MODELS.delivery];

// Broadcasts an in-app notification (this app's own Notification feed, shown via
// the bell in each portal) to every account of the chosen audience. There is no
// real push/SMS/email provider wired up, so this is the actual delivery
// mechanism — not a queued message to an external service.
export async function broadcastNotification(req, res, next) {
  try {
    const { audience, title, message } = req.body;
    if (!RECIPIENT_MODELS[audience]) throw new ApiError(400, 'Invalid audience');
    if (!title?.trim() || !message?.trim()) throw new ApiError(400, 'Title and message are required');

    let recipientCount = 0;
    for (const { role, Model, filter } of RECIPIENT_MODELS[audience]) {
      const recipients = await Model.find(filter).select('_id');
      if (!recipients.length) continue;
      await Notification.insertMany(
        recipients.map((r) => ({
          recipientId: r._id,
          recipientRole: role,
          type: 'general',
          title: title.trim(),
          message: message.trim(),
        }))
      );
      recipientCount += recipients.length;
    }

    await logAdminAction(req, 'notification.broadcast', { targetType: audience, details: `${title} (${recipientCount} recipients)` });
    res.status(201).json({ message: 'Broadcast sent', recipientCount });
  } catch (err) {
    next(err);
  }
}

export async function listMyNotifications(req, res, next) {
  try {
    const filter = { recipientId: req.user._id, recipientRole: req.role };
    if (req.query.unreadOnly === 'true') filter.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(100),
      Notification.countDocuments({ recipientId: req.user._id, recipientRole: req.role, isRead: false }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id, recipientRole: req.role },
      { isRead: true },
      { new: true }
    );
    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany({ recipientId: req.user._id, recipientRole: req.role, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}
