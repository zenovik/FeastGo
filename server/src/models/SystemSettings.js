import mongoose from 'mongoose';

// Singleton document — there is only ever one SystemSettings row, fetched/created
// on demand by getOrCreate(). Payment gateway / email / SMS fields store
// configuration only; this app does not integrate a real provider, so no
// message is ever actually sent/charged through them.
const systemSettingsSchema = new mongoose.Schema(
  {
    appName: { type: String, default: 'FeastGo' },
    supportEmail: { type: String, default: 'support@feastgo.app' },
    maintenanceMode: { type: Boolean, default: false },
    commissionPercent: { type: Number, default: 15 },
    defaultDeliveryFee: { type: Number, default: 2.5 },
    taxPercent: { type: Number, default: 5 },
    paymentGateway: {
      provider: { type: String, default: 'razorpay' },
      apiKey: { type: String, default: '' },
      enabled: { type: Boolean, default: false },
    },
    email: {
      smtpHost: { type: String, default: '' },
      smtpPort: { type: Number, default: 587 },
      fromAddress: { type: String, default: '' },
      enabled: { type: Boolean, default: false },
    },
    sms: {
      provider: { type: String, default: '' },
      apiKey: { type: String, default: '' },
      enabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

systemSettingsSchema.statics.getOrCreate = async function getOrCreate() {
  let settings = await this.findOne();
  if (!settings) settings = await this.create({});
  return settings;
};

export default mongoose.model('SystemSettings', systemSettingsSchema);
