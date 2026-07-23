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

export interface DeliveryAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: 'bike' | 'scooter' | 'bicycle' | 'car';
  vehicleNumber: string;
  status: AccountStatus;
  isOnline: boolean;
  isSuspended?: boolean;
  location: { lat: number | null; lng: number | null };
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
