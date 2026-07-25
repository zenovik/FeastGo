import mongoose from 'mongoose';

const restaurantOwnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    businessName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

restaurantOwnerSchema.methods.toSafeObject = function toSafeObject() {
  const { _id, name, businessName, email, phone, restaurant, status, isSuspended, createdAt } = this;
  return { id: _id, name, businessName, email, phone, restaurant, status, isSuspended, role: 'seller', createdAt };
};

export default mongoose.model('RestaurantOwner', restaurantOwnerSchema);
