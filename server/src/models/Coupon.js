import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null }, // null = platform-wide
    offerType: { type: String, enum: ['discount', 'bogo', 'combo', 'flash'], default: 'discount' },
    discountType: { type: String, enum: ['percent', 'flat'], required: true },
    value: { type: Number, required: true },
    maxDiscount: { type: Number, default: null },
    minOrder: { type: Number, default: 0 },
    usageLimit: { type: Number, default: null },
    timesUsed: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    // BOGO: buy `buyQty` of an item, get `getQty` free/discounted.
    buyQty: { type: Number, default: 1 },
    getQty: { type: Number, default: 1 },
    // Combo: bundle of menu items at a fixed price.
    comboItems: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }], default: [] },
    comboPrice: { type: Number, default: null },
    // Scopes a discount/bogo/flash offer to specific menu items instead of the
    // whole order — empty means restaurant/order-wide (existing behavior).
    applicableItems: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Coupon', couponSchema);
