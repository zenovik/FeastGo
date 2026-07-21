import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    category: { type: String, required: true }, // e.g. Starters, Main Course, Desserts, Beverages
    isVeg: { type: Boolean, default: true },
    isBestseller: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    spiceLevel: { type: Number, min: 0, max: 3, default: 0 },
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
  },
  { timestamps: true }
);

export default mongoose.model('MenuItem', menuItemSchema);
