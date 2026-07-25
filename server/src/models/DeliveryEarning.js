import mongoose from 'mongoose';

// One row per completed delivery, so earnings reports (daily/weekly/monthly,
// tips vs base fee) don't have to be re-derived from Order aggregates alone.
const deliveryEarningSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    baseFee: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('DeliveryEarning', deliveryEarningSchema);
