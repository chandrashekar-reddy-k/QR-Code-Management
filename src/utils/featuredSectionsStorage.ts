import { FeaturedSection } from './types';

export const FEATURED_SECTIONS_STORAGE_KEY = 'villagkart_featured_sections';

export const initialFeaturedSections: FeaturedSection[] = [
  {
    id: 1,
    title: 'Featured Products',
    shortDescription: 'Weekends deal goes here',
    style: 'style_1',
    productType: 'Featured',
    categoryIds: '100,205,360',
    position: 1,
  },
  {
    id: 2,
    title: 'Products on Sale',
    shortDescription: 'Special discounts on selected items',
    style: 'style_2',
    productType: 'Sale',
    categoryIds: '150,250,400',
    position: 2,
  },
  {
    id: 3,
    title: 'New Arrivals',
    shortDescription: 'Latest products just arrived',
    style: 'style_3',
    productType: 'New',
    categoryIds: '200,300,450',
    position: 3,
  },
  {
    id: 4,
    title: 'Best Sellers',
    shortDescription: 'Top selling products this month',
    style: 'style_4',
    productType: 'Best Seller',
    categoryIds: '120,220,380',
    position: 4,
  },
  {
    id: 5,
    title: 'Flash Sale',
    shortDescription: 'Limited time offers',
    style: 'style_1',
    productType: 'Flash Sale',
    categoryIds: '180,280,420',
    position: 5,
  },
];

export const getStoredFeaturedSections = (): FeaturedSection[] => {
  try {
    const raw = localStorage.getItem(FEATURED_SECTIONS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read featured sections from localStorage:', err);
  }
  return initialFeaturedSections;
};

export const saveStoredFeaturedSections = (sections: FeaturedSection[]): void => {
  try {
    localStorage.setItem(FEATURED_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
  } catch (err) {
    console.error('Failed to save featured sections to localStorage:', err);
  }
};
