export interface DeliveryBoy {
  id: number;
  name: string;
  mobile: string;
  email: string;
  bonus: number;
  documents: string;
  dateOfBirth: string;
  city: string;
  address: string;
  balance: number;
  cashReceived: number;
  otherPaymentInformation: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  available: boolean;
  date: string;
  avatar?: string;
}

export interface DeliveryBoyFormData {
  name: string;
  dateOfBirth: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
  ifscCode: string;
  bankName: string;
  accountNumber: string;
  bankAccountName: string;
  city: string;
  state: string;
  street: string;
  latitude: number;
  longitude: number;
  address: string;
  otherPaymentInformation: string;
  drivingLicense: File | null;
  nationalIdentityCard: File | null;
  bonusType: string;
  avatar: File | null;
}

