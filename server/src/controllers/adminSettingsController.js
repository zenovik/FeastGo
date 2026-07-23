import SystemSettings from '../models/SystemSettings.js';
import { logAdminAction } from '../utils/auditLog.js';

const SETTINGS_FIELDS = [
  'appName',
  'supportEmail',
  'maintenanceMode',
  'commissionPercent',
  'defaultDeliveryFee',
  'taxPercent',
  'paymentGateway',
  'email',
  'sms',
];

export async function getSettings(_req, res, next) {
  try {
    const settings = await SystemSettings.getOrCreate();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const settings = await SystemSettings.getOrCreate();
    for (const field of SETTINGS_FIELDS) {
      if (req.body[field] !== undefined) settings[field] = req.body[field];
    }
    await settings.save();
    await logAdminAction(req, 'settings.update', { targetType: 'SystemSettings', targetId: settings._id });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}
