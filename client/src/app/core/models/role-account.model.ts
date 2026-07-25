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

export interface DeliveryAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  vehicleType: 'bike' | 'scooter' | 'bicycle' | 'car';
  vehicleNumber: string;
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
  currentOrder: string | null;
  location: { lat: number | null; lng: number | null };
  lastLocationAt: string | null;
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
