import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    photo: { type: String, default: '' },
    dob: { type: Date, default: null },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say', null], default: null },

    vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'car'], default: 'bike' },
    vehicleNumber: { type: String, default: '' },

    // Text identifiers shown (masked) alongside the KYC document photos below —
    // the number itself, not a scan of the card.
    licenseNumber: { type: String, default: '' },
    aadhaarNumber: { type: String, default: '' },
    panNumber: { type: String, default: '' },

    // KYC documents — stored as base64 data-URLs, same convention as menu/category
    // images elsewhere in this app (no file-storage service is set up).
    documents: {
      license: { type: String, default: '' },
      aadhaar: { type: String, default: '' },
      pan: { type: String, default: '' },
      rc: { type: String, default: '' },
      insurance: { type: String, default: '' },
    },
    documentsSubmitted: { type: Boolean, default: false },

    bankDetails: {
      accountHolder: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
    },

    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '' },
    isOnline: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },

    // Count of orders this partner has rejected after being assigned (not
    // account-approval rejections — see `rejectionReason` above for that).
    // Crossing SystemSettings.maxRejectionsBeforeFlag auto-sets flaggedForReview
    // once; admin clears it manually after reviewing the partner's history.
    orderRejectionCount: { type: Number, default: 0 },
    flaggedForReview: { type: Boolean, default: false },

    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    // Self-set goal shown as a progress bar against today's earnings on the
    // partner's own dashboard — purely a personal target, not enforced.
    dailyTarget: { type: Number, default: 1000 },

    currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    lastLocationAt: { type: Date, default: null },

    notificationPrefs: {
      newDeliveryRequest: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      earnings: { type: Boolean, default: true },
      promotional: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    language: { type: String, default: 'en' },

    // Availability preferences — read by autoAssignDeliveryPartner (see
    // utils/deliveryAssign.js): autoAcceptOrders skips the manual "accept"
    // step entirely, acceptRadiusKm excludes this partner from candidacy for
    // orders further than that from their last known location.
    autoAcceptOrders: { type: Boolean, default: false },
    acceptRadiusKm: { type: Number, default: 5 },

    defaultMapsApp: { type: String, enum: ['google', 'apple', 'waze'], default: 'google' },
    voiceNavigation: { type: Boolean, default: true },
    routePreference: { type: String, enum: ['fastest', 'shortest', 'avoid_tolls'], default: 'fastest' },

    // Bumped by "Logout from all devices" — every JWT issued before the bump
    // fails resolveActor's check and is rejected on its next request.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

deliveryPartnerSchema.methods.toSafeObject = function toSafeObject() {
  const {
    _id,
    name,
    email,
    phone,
    photo,
    dob,
    gender,
    vehicleType,
    vehicleNumber,
    licenseNumber,
    aadhaarNumber,
    panNumber,
    documents,
    documentsSubmitted,
    bankDetails,
    emergencyContact,
    status,
    rejectionReason,
    isOnline,
    isSuspended,
    phoneVerified,
    orderRejectionCount,
    flaggedForReview,
    rating,
    dailyTarget,
    currentOrder,
    location,
    lastLocationAt,
    notificationPrefs,
    theme,
    language,
    autoAcceptOrders,
    acceptRadiusKm,
    defaultMapsApp,
    voiceNavigation,
    routePreference,
    createdAt,
  } = this;
  return {
    id: _id,
    name,
    email,
    phone,
    photo,
    dob,
    gender,
    vehicleType,
    vehicleNumber,
    licenseNumber,
    aadhaarNumber,
    panNumber,
    documents,
    documentsSubmitted,
    bankDetails,
    emergencyContact,
    status,
    rejectionReason,
    isOnline,
    isSuspended,
    phoneVerified,
    orderRejectionCount,
    flaggedForReview,
    rating,
    dailyTarget,
    currentOrder,
    location,
    lastLocationAt,
    notificationPrefs,
    theme,
    language,
    autoAcceptOrders,
    acceptRadiusKm,
    defaultMapsApp,
    voiceNavigation,
    routePreference,
    role: 'delivery',
    createdAt,
  };
};

export default mongoose.model('DeliveryPartner', deliveryPartnerSchema);
