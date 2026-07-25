import mongoose from 'mongoose';

// Two independent threads can exist per order — customer<->delivery and
// seller<->delivery (customer and seller never message each other directly).
// `thread` disambiguates which one a message belongs to since the delivery
// partner is a participant in both.
const messageSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    thread: { type: String, enum: ['customer-delivery', 'seller-delivery'], required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderRole: { type: String, enum: ['customer', 'seller', 'delivery'], required: true },
    senderName: { type: String, required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientRole: { type: String, enum: ['customer', 'seller', 'delivery'], required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ order: 1, thread: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
