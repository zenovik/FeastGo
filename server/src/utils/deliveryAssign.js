import DeliveryPartner from '../models/DeliveryPartner.js';
import DeliveryAssignment from '../models/DeliveryAssignment.js';
import { notifyDeliveryAssigned } from './notify.js';

// Picks the first approved, online, free (no current order) partner. There's
// no live geolocation-based matching in this app, so this is a simple FIFO —
// good enough given the scale, and admin can always assign/reassign manually.
// `excludePartnerIds` keeps a rejection from immediately reassigning the same
// order right back to a partner who already turned it down (or anyone else
// already tried for it).
export async function autoAssignDeliveryPartner(order, restaurant, excludePartnerIds = []) {
  const filter = {
    status: 'approved',
    isSuspended: false,
    isOnline: true,
    currentOrder: null,
  };
  if (excludePartnerIds.length) filter._id = { $nin: excludePartnerIds };

  const partner = await DeliveryPartner.findOne(filter).sort({ lastLocationAt: -1, updatedAt: -1 });

  if (!partner) return null;

  await DeliveryAssignment.create({ order: order._id, partner: partner._id, assignedByRole: 'auto', status: 'assigned' });

  order.deliveryPartner = partner._id;
  order.deliveryStatus = 'assigned';
  order.deliveryStatusHistory.push({ status: 'assigned' });
  await order.save();

  partner.currentOrder = order._id;
  await partner.save();

  await notifyDeliveryAssigned(order, partner);
  return partner;
}
