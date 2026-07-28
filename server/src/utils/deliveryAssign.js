import DeliveryPartner from '../models/DeliveryPartner.js';
import DeliveryAssignment from '../models/DeliveryAssignment.js';
import { notifyDeliveryAssigned } from './notify.js';

const EARTH_RADIUS_KM = 6371;

function haversineKm(a, b) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Picks an approved, online, free (no current order) partner within their own
// acceptRadiusKm of the restaurant, closest first. There's no live GPS
// tracking in this app — this is a best-effort match against each partner's
// last known location, falling back to FIFO (most recently active) for
// partners with no location on file, since we can't evaluate their radius.
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

  const candidates = await DeliveryPartner.find(filter).sort({ lastLocationAt: -1, updatedAt: -1 });
  if (!candidates.length) return null;

  const restaurantLoc = restaurant?.location;
  const hasRestaurantLoc = Number.isFinite(restaurantLoc?.lat) && Number.isFinite(restaurantLoc?.lng) && (restaurantLoc.lat !== 0 || restaurantLoc.lng !== 0);

  let partner = null;
  if (hasRestaurantLoc) {
    let bestDistance = Infinity;
    for (const candidate of candidates) {
      const loc = candidate.location;
      const hasLoc = Number.isFinite(loc?.lat) && Number.isFinite(loc?.lng);
      if (!hasLoc) continue;
      const distance = haversineKm(restaurantLoc, loc);
      if (distance <= candidate.acceptRadiusKm && distance < bestDistance) {
        bestDistance = distance;
        partner = candidate;
      }
    }
    // No located candidate falls within their own radius — fall back to the
    // FIFO order rather than leaving the order unassigned over a preference.
    if (!partner) partner = candidates[0];
  } else {
    partner = candidates[0];
  }

  const autoAccept = partner.autoAcceptOrders === true;
  const initialStatus = autoAccept ? 'accepted' : 'assigned';

  await DeliveryAssignment.create({
    order: order._id,
    partner: partner._id,
    assignedByRole: 'auto',
    status: initialStatus,
    ...(autoAccept ? { respondedAt: new Date() } : {}),
  });

  order.deliveryPartner = partner._id;
  order.deliveryStatus = initialStatus;
  order.deliveryStatusHistory.push({ status: initialStatus });
  await order.save();

  partner.currentOrder = order._id;
  await partner.save();

  await notifyDeliveryAssigned(order, partner);
  return partner;
}
