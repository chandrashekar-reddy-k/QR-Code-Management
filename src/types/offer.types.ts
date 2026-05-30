export interface OfferImage {
  id: number;
  type: string;
  name: string;
  image: string;
  status: 'active' | 'inactive';
}

export interface OfferImageFormData {
  type: string;
  name: string;
  image: File | null;
}

export interface PopupOffer {
  id?: number;
  enabled: boolean;
  type: string;
  popupUrl: string;
  link: string;
  image: string;
}

export interface PopupOfferFormData {
  enabled: boolean;
  type: string;
  popupUrl: string;
  link: string;
  image: File | null;
}

