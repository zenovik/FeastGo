import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'car'], default: 'bike' },
    vehicleNumber: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    isOnline: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

deliveryPartnerSchema.methods.toSafeObject = function toSafeObject() {
  const { _id, name, email, phone, vehicleType, vehicleNumber, status, isOnline, isSuspended, location, createdAt } = this;
  return { id: _id, name, email, phone, vehicleType, vehicleNumber, status, isOnline, isSuspended, location, role: 'delivery', createdAt };
};

export default mongoose.model('DeliveryPartner', deliveryPartnerSchema);
