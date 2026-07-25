import Notification from '../models/Notification.js';
import User from '../models/User.js';
import RestaurantOwner from '../models/RestaurantOwner.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { ApiError } from '../utils/ApiError.js';
import { logAdminAction } from '../utils/auditLog.js';
import { createNotificationsBulk } from '../utils/notify.js';

const RECIPIENT_MODELS = {
  customer: [{ role: 'customer', Model: User, filter: { role: 'user' } }],
  seller: [{ role: 'seller', Model: RestaurantOwner, filter: {} }],
  delivery: [{ role: 'delivery', Model: DeliveryPartner, filter: {} }],
};
RECIPIENT_MODELS.all = [...RECIPIENT_MODELS.customer, ...RECIPIENT_MODELS.seller, ...RECIPIENT_MODELS.delivery];

const INDIVIDUAL_MODELS = { customer: User, seller: RestaurantOwner, delivery: DeliveryPartner };

// Powers the admin broadcast composer's "send to one person" search box —
// looks up accounts by name/email/phone within a single role so the admin
// can pick an exact recipient before sending an individual notification.
export async function searchRecipients(req, res, next) {
  try {
    const { role, q } = req.query;
    const Model = INDIVIDUAL_MODELS[role];
    if (!Model) throw new ApiError(400, 'Invalid role');

    const filter = role === 'customer' ? { role: 'user' } : {};
    if (q?.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }

    const accounts = await Model.find(filter).select('name email phone').sort({ name: 1 }).limit(20);
    res.json({ accounts: accounts.map((a) => ({ id: a._id, name: a.name, email: a.email, phone: a.phone })) });
  } catch (err) {
    next(err);
  }
}

// Broadcasts an in-app notification (this app's own Notification feed, shown via
// the bell in each portal) to every account of the chosen audience, a single
// individual account, and optionally holds it for future delivery. There is no
// real push/SMS/email provider wired up, so this is the actual delivery
// mechanism — not a queued message to an external service.
export async function broadcastNotification(req, res, next) {
  try {
    const { audience, targetType = 'audience', targetId, title, message, category, priority, scheduledFor } = req.body;
    if (!title?.trim() || !message?.trim()) throw new ApiError(400, 'Title and message are required');

    const CATEGORY_TYPE = { promotional: 'promotional', maintenance: 'maintenance', festival: 'festival_greeting', emergency: 'emergency_alert' };
    const type = CATEGORY_TYPE[category] ?? 'general';
    const resolvedPriority = priority ?? (category === 'emergency' ? 'critical' : 'medium');
    const scheduledForDate = scheduledFor ? new Date(scheduledFor) : null;
    if (scheduledForDate && Number.isNaN(scheduledForDate.getTime())) throw new ApiError(400, 'Invalid scheduledFor date');

    let recipients = [];
    if (targetType === 'individual') {
      if (!targetId || !INDIVIDUAL_MODELS[audience]) throw new ApiError(400, 'Invalid target');
      const Model = INDIVIDUAL_MODELS[audience];
      const account = await Model.findById(targetId).select('_id');
      if (!account) throw new ApiError(404, 'Recipient not found');
      recipients = [{ role: audience, id: account._id }];
    } else {
      if (!RECIPIENT_MODELS[audience]) throw new ApiError(400, 'Invalid audience');
      for (const { role, Model, filter } of RECIPIENT_MODELS[audience]) {
        const accounts = await Model.find(filter).select('_id');
        recipients.push(...accounts.map((a) => ({ role, id: a._id })));
      }
    }
    if (!recipients.length) throw new ApiError(400, 'No recipients match this target');

    await createNotificationsBulk(
      recipients.map(({ role, id }) => ({
        recipientId: id,
        recipientRole: role,
        senderId: req.user._id,
        senderRole: 'admin',
        type,
        priority: resolvedPriority,
        title: title.trim(),
        message: message.trim(),
        category: category ?? null,
        scheduledFor: scheduledForDate,
      }))
    );

    await logAdminAction(req, 'notification.broadcast', {
      targetType: targetType === 'individual' ? `individual:${audience}` : audience,
      details: `${title} (${recipients.length} recipient(s))${scheduledForDate ? ` — scheduled for ${scheduledForDate.toISOString()}` : ''}`,
    });
    res.status(201).json({ message: 'Notification sent', recipientCount: recipients.length, scheduled: !!scheduledForDate });
  } catch (err) {
    next(err);
  }
}

const MAX_LIMIT = 50;

export async function listMyNotifications(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {
      recipientId: req.user._id,
      recipientRole: req.role,
      isArchived: req.query.archived === 'true',
      $or: [{ scheduledFor: null }, { scheduledFor: { $lte: new Date() } }],
    };
    if (req.query.unreadOnly === 'true') filter.isRead = false;
    if (req.query.isRead === 'true') filter.isRead = true;
    if (req.query.isRead === 'false') filter.isRead = false;
    if (req.query.type) filter.type = { $in: String(req.query.type).split(',') };
    if (req.query.priority) filter.priority = { $in: String(req.query.priority).split(',') };
    if (req.query.relatedModule) filter.relatedModule = { $in: String(req.query.relatedModule).split(',') };
    if (req.query.q?.trim()) {
      const q = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$and = [{ $or: [{ title: q }, { message: q }] }];
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        recipientId: req.user._id,
        recipientRole: req.role,
        isRead: false,
        isArchived: false,
        $or: [{ scheduledFor: null }, { scheduledFor: { $lte: new Date() } }],
      }),
    ]);

    res.json({ notifications, unreadCount, total, page, limit, hasMore: page * limit < total });
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
    if (!notification) throw new ApiError(404, 'Notification not found');
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

export async function deleteNotification(req, res, next) {
  try {
    const result = await Notification.findOneAndDelete({ _id: req.params.id, recipientId: req.user._id, recipientRole: req.role });
    if (!result) throw new ApiError(404, 'Notification not found');
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
}

export async function clearAllNotifications(req, res, next) {
  try {
    const filter = { recipientId: req.user._id, recipientRole: req.role };
    if (req.query.archived === 'true') filter.isArchived = true;
    const result = await Notification.deleteMany(filter);
    res.json({ message: 'Notifications cleared', deletedCount: result.deletedCount });
  } catch (err) {
    next(err);
  }
}

export async function archiveNotification(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id, recipientRole: req.role },
      { isArchived: true, archivedAt: new Date() },
      { new: true }
    );
    if (!notification) throw new ApiError(404, 'Notification not found');
    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

export async function restoreNotification(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id, recipientRole: req.role },
      { isArchived: false, archivedAt: null },
      { new: true }
    );
    if (!notification) throw new ApiError(404, 'Notification not found');
    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

const BULK_UPDATES = {
  read: { isRead: true },
  unread: { isRead: false },
  archive: { isArchived: true, archivedAt: new Date() },
  restore: { isArchived: false, archivedAt: null },
};

export async function bulkNotificationAction(req, res, next) {
  try {
    const { action, ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) throw new ApiError(400, 'ids must be a non-empty array');

    const filter = { _id: { $in: ids }, recipientId: req.user._id, recipientRole: req.role };

    if (action === 'delete') {
      const result = await Notification.deleteMany(filter);
      return res.json({ message: 'Notifications deleted', deletedCount: result.deletedCount });
    }

    const update = BULK_UPDATES[action];
    if (!update) throw new ApiError(400, 'Invalid bulk action');
    const result = await Notification.updateMany(filter, update);
    res.json({ message: 'Notifications updated', modifiedCount: result.modifiedCount });
  } catch (err) {
    next(err);
  }
}
