export interface Category {
  id: number;
  parentId: number | null;
  name: string;
  subtitle: string;
  image: string;
  status: 'active' | 'inactive';
  slug: string;
  order?: number;
}

