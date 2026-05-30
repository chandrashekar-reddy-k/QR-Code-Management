export interface FeaturedSection {
  id: number;
  title: string;
  shortDescription: string;
  style: string;
  productType: string;
  categoryIds: string;
  position: number;
}

export interface FeaturedSectionFormData {
  title: string;
  shortDescription: string;
  categoryIds: string;
  productType: string;
  position: string;
  backgroundColorLight: string;
  backgroundColorDark: string;
  appStyle: string;
  webStyle: string;
}

