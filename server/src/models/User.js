import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    line1: { type: String, required: true },
    area: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
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
    gender: { type: String, enum: ['male', 'female', 'other', null], default: null },
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
  },
  { timestamps: true }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  const { _id, name, email, phone, gender, photo, location, role, adminRole, addresses, favoriteRestaurants, isBlocked, createdAt } =
    this;
  return { id: _id, name, email, phone, gender, photo, location, role, adminRole, addresses, favoriteRestaurants, isBlocked, createdAt };
};

export default mongoose.model('User', userSchema);
