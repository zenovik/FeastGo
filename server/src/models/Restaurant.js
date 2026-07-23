import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    cuisines: [{ type: String, index: true }],
    category: { type: String, default: '' },
    priceRange: { type: Number, min: 1, max: 3, default: 2 }, // 1=$, 2=$$, 3=$$$
    rating: { type: Number, default: 4.2, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    deliveryTimeMin: { type: Number, default: 25 },
    deliveryTimeMax: { type: Number, default: 40 },
    deliveryFee: { type: Number, default: 2.5 },
    minOrder: { type: Number, default: 8 },
    coverImage: { type: String, default: '' },
    logoImage: { type: String, default: '' },
    images: { type: [String], default: [] },
    address: {
      line1: { type: String, default: '' },
      area: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zip: { type: String, default: '' },
    },
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    isOpen: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isPromoted: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    tags: [{ type: String }],
    offer: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantOwner', default: null, index: true },
    verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    businessHours: {
      type: [
        {
          day: { type: Number, min: 0, max: 6 }, // 0=Sunday
          open: { type: String, default: '09:00' },
          close: { type: String, default: '22:00' },
          closed: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    holidays: {
      type: [
        {
          date: { type: Date, required: true },
          reason: { type: String, default: '' },
        },
      ],
      default: [],
    },
    deliveryRadiusKm: { type: Number, default: 5 },
    openingTime: { type: String, default: '09:00' },
    closingTime: { type: String, default: '22:00' },
    fssaiNumber: { type: String, default: '' },
    socialLinks: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      x: { type: String, default: '' },
      website: { type: String, default: '' },
    },
    gstNumber: { type: String, default: '' },
    bankDetails: {
      accountHolder: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      bankName: { type: String, default: '' },
    },
    notificationPrefs: {
      newOrder: { type: Boolean, default: true },
      cancelledOrder: { type: Boolean, default: true },
      payment: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
    },
    categoryOrder: { type: [String], default: [] },
  },
  { timestamps: true }
);

restaurantSchema.index({ name: 'text', cuisines: 'text', tags: 'text' });

export default mongoose.model('Restaurant', restaurantSchema);
