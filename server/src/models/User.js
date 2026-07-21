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
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: null },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    addresses: [addressSchema],
    favoriteRestaurants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
  },
  { timestamps: true }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  const { _id, name, email, phone, role, addresses, favoriteRestaurants, createdAt } = this;
  return { id: _id, name, email, phone, role, addresses, favoriteRestaurants, createdAt };
};

export default mongoose.model('User', userSchema);
