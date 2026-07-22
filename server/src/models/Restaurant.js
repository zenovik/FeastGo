import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    cuisines: [{ type: String, index: true }],
    priceRange: { type: Number, min: 1, max: 3, default: 2 }, // 1=$, 2=$$, 3=$$$
    rating: { type: Number, default: 4.2, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    deliveryTimeMin: { type: Number, default: 25 },
    deliveryTimeMax: { type: Number, default: 40 },
    deliveryFee: { type: Number, default: 2.5 },
    minOrder: { type: Number, default: 8 },
    coverImage: { type: String, required: true },
    logoImage: { type: String, default: '' },
    images: { type: [String], default: [] },
    address: {
      line1: { type: String, default: '' },
      area: { type: String, default: '' },
      city: { type: String, default: '' },
    },
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    isOpen: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isPromoted: { type: Boolean, default: false },
    tags: [{ type: String }],
    offer: { type: String, default: '' },
  },
  { timestamps: true }
);

restaurantSchema.index({ name: 'text', cuisines: 'text', tags: 'text' });

export default mongoose.model('Restaurant', restaurantSchema);
