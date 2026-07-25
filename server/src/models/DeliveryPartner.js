import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    photo: { type: String, default: '' },

    vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'car'], default: 'bike' },
    vehicleNumber: { type: String, default: '' },

    // KYC documents — stored as base64 data-URLs, same convention as menu/category
    // images elsewhere in this app (no file-storage service is set up).
    documents: {
      license: { type: String, default: '' },
      aadhaar: { type: String, default: '' },
      pan: { type: String, default: '' },
      rc: { type: String, default: '' },
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
    vehicleType,
    vehicleNumber,
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
    createdAt,
  } = this;
  return {
    id: _id,
    name,
    email,
    phone,
    photo,
    vehicleType,
    vehicleNumber,
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
    role: 'delivery',
    createdAt,
  };
};

export default mongoose.model('DeliveryPartner', deliveryPartnerSchema);
