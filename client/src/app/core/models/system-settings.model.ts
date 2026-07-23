export interface SystemSettings {
  _id: string;
  appName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  commissionPercent: number;
  defaultDeliveryFee: number;
  taxPercent: number;
  paymentGateway: { provider: string; apiKey: string; enabled: boolean };
  email: { smtpHost: string; smtpPort: number; fromAddress: string; enabled: boolean };
  sms: { provider: string; apiKey: string; enabled: boolean };
}
