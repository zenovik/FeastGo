import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    line1: { type: String, required: true },
    area: { type: String, default: '' },
    landmark: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
    phone: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false }
);

const savedCardSchema = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    brand: { type: String, default: '' },
    // Only ever the last 4 digits — this app has no real payment gateway, and
    // even in a demo, a full card number/CVV is never something to collect or
    // store. Mirrors how a real integration would only keep a token + last4
    // after the gateway itself handles the sensitive part.
    last4: { type: String, required: true, match: /^\d{4}$/ },
    expiryMonth: { type: Number, required: true, min: 1, max: 12 },
    expiryYear: { type: Number, required: true },
  },
  { _id: true, timestamps: false }
);

const savedUpiSchema = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    upiId: { type: String, required: true, trim: true },
  },
  { _id: true, timestamps: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Either phone or email verifies identity at signup — the other is
    // optional and can be added later from the profile page. Neither field
    // has a `default`, deliberately: a sparse unique index only excludes
    // documents where the field is genuinely absent, not ones storing an
    // explicit null (see the same lesson learned on Notification.dedupeKey).
    phone: { type: String, unique: true, sparse: true, trim: true },
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    termsAcceptedAt: { type: Date, default: null },
    dob: { type: Date, default: null },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say', null], default: null },
    photo: { type: String, default: null },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    adminRole: { type: String, enum: ['super_admin', 'manager', 'support', null], default: null },
    // Only ever set for admin accounts — customers authenticate via phone OTP.
    passwordHash: { type: String, default: null, select: false },
    addresses: [addressSchema],
    favoriteRestaurants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
    isBlocked: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    notificationPrefs: {
      orderUpdates: { type: Boolean, default: true },
      promotional: { type: Boolean, default: true },
      offers: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    // 'system' resolves to the browser's prefers-color-scheme on the client;
    // stored here purely so the choice follows the user across devices.
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    language: { type: String, default: 'en' },
    savedCards: [savedCardSchema],
    savedUpi: [savedUpiSchema],
  },
  { timestamps: true }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  const {
    _id,
    name,
    email,
    phone,
    dob,
    gender,
    photo,
    location,
    role,
    adminRole,
    addresses,
    favoriteRestaurants,
    isBlocked,
    notificationPrefs,
    theme,
    language,
    savedCards,
    savedUpi,
    createdAt,
  } = this;
  return {
    id: _id,
    name,
    email,
    phone,
    dob,
    gender,
    photo,
    location,
    role,
    adminRole,
    addresses,
    favoriteRestaurants,
    isBlocked,
    notificationPrefs,
    theme,
    language,
    savedCards,
    savedUpi,
    createdAt,
  };
};

export default mongoose.model('User', userSchema);
