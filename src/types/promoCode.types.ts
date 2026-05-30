export interface PromoCode {
  id: number;
  promoCode: string;
  message: string;
  startDate: string;
  endDate: string;
  noOfUsers: number;
  minimumOrderAmount: number;
  discount: number;
  discountType: 'amount' | 'percentage';
  image: string;
  status: 'active' | 'inactive';
  validity: string;
  repeatUsage?: string;
}

export interface PromoCodeFormData {
  promoCode: string;
  message: string;
  startDate: string;
  endDate: string;
  noOfUsers: number;
  minimumOrderAmount: number;
  discount: number;
  discountType: 'amount' | 'percentage';
  repeatUsage: string;
  image: File | null;
}

export interface PromoCodeFormValues {
  codeName: string;
  discountType: string;
  minimumOrderValue: string;
  maximumDiscount: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  usageLimit: string;
  whereItApplies: string;
}

