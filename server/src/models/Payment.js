import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    method: { type: String, enum: ['card', 'upi', 'cod'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    amount: { type: Number, required: true },
    transactionId: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
