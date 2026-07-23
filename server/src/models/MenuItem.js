import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    images: { type: [String], default: [] },
    category: { type: String, required: true }, // e.g. Starters, Main Course, Desserts, Beverages
    isVeg: { type: Boolean, default: true },
    isBestseller: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isRecommended: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    isHiddenByAdmin: { type: Boolean, default: false },
    spiceLevel: { type: Number, min: 0, max: 3, default: 0 },
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    stockCount: { type: Number, default: null }, // null = unlimited stock
    lowStockThreshold: { type: Number, default: 5 },
    sortOrder: { type: Number, default: 0 },
    scheduledAvailability: {
      enabled: { type: Boolean, default: false },
      days: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] }, // 0=Sunday
      startTime: { type: String, default: '00:00' },
      endTime: { type: String, default: '23:59' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('MenuItem', menuItemSchema);
