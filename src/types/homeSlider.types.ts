export interface HomeSlider {
  id: number;
  type: string;
  name: string;
  image: string;
  status: 'active' | 'inactive';
}

export interface HomeSliderFormData {
  type: string;
  name: string;
  image: File | null;
}

