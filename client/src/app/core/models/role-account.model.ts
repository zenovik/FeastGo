export type AccountStatus = 'pending' | 'approved' | 'rejected';

export interface SellerAccount {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  restaurant: string | null;
  status: AccountStatus;
  isSuspended?: boolean;
  role: 'seller';
  createdAt: string;
}

export interface DeliveryDocuments {
  license: string;
  aadhaar: string;
  pan: string;
  rc: string;
  insurance: string;
}

export interface DeliveryBankDetails {
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
}

export interface DeliveryEmergencyContact {
  name: string;
  phone: string;
}

export interface DeliveryNotificationPrefs {
  newDeliveryRequest: boolean;
  orderUpdates: boolean;
  earnings: boolean;
  promotional: boolean;
  email: boolean;
  push: boolean;
}

export interface DeliveryAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  dob: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  vehicleType: 'bike' | 'scooter' | 'bicycle' | 'car';
  vehicleNumber: string;
  licenseNumber: string;
  aadhaarNumber: string;
  panNumber: string;
  documents: DeliveryDocuments;
  documentsSubmitted: boolean;
  bankDetails: DeliveryBankDetails;
  emergencyContact: DeliveryEmergencyContact;
  status: AccountStatus;
  rejectionReason: string;
  isOnline: boolean;
  isSuspended?: boolean;
  phoneVerified: boolean;
  orderRejectionCount: number;
  flaggedForReview: boolean;
  rating: { average: number; count: number };
  dailyTarget: number;
  currentOrder: string | null;
  location: { lat: number | null; lng: number | null };
  lastLocationAt: string | null;
  notificationPrefs: DeliveryNotificationPrefs;
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoAcceptOrders: boolean;
  acceptRadiusKm: number;
  defaultMapsApp: 'google' | 'apple' | 'waze';
  voiceNavigation: boolean;
  routePreference: 'fastest' | 'shortest' | 'avoid_tolls';
  role: 'delivery';
  createdAt: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: 'admin';
  adminRole?: 'super_admin' | 'manager' | 'support' | null;
  createdAt: string;
}
