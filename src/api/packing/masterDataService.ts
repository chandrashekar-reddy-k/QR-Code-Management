import apiClient from './axios';

// --- Types matching Prisma Schema ---
export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  uomId: string;
  unit?: string;
  productType?: 'RAW_MATERIAL' | 'PACKAGING' | 'FINISHED_GOOD' | 'BRANDED';
  type?: string; // For backward compatibility if any component uses it
  isActive?: boolean;
  category?: Category;
  uom?: UnitOfMeasure;
  productionStock?: {
    inProductionQty: number;
    packedQty: number;
    processingStage?: string;
  };
  resolvedSku?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

export interface RecipeItem {
  id?: string;
  inputProductId: string;
  requiredQty: number;
  tolerancePct?: number;
  isPackaging?: boolean;
  inputProduct?: Product;
}

export interface Recipe {
  id: string;
  code: string;
  name: string;
  outputProductId: string;
  outputQty: number;
  isActive?: boolean;
  items?: RecipeItem[];
  outputProduct?: Product;
}

// Helper to extract list from backend response envelope { success: true, data: { data: [...], total, page } }
const extractList = (res: any) => {
  const payload = res.data?.data;
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  return [];
};

// --- API Service ---
export const masterDataService = {
  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await apiClient.get<any>('/master-data/categories?limit=1000');
    return extractList(res);
  },
  async createCategory(data: Partial<Category>): Promise<Category> {
    const res = await apiClient.post<{ success: boolean; data: Category }>('/master-data/categories', data);
    return res.data.data;
  },
  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const res = await apiClient.put<{ success: boolean; data: Category }>(`/master-data/categories/${id}`, data);
    return res.data.data;
  },
  async toggleCategoryStatus(id: string): Promise<Category> {
    const res = await apiClient.patch<{ success: boolean; data: Category }>(`/master-data/categories/${id}`);
    return res.data.data;
  },
  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/master-data/categories/${id}`);
  },

  // Units of Measure
  async getUOMs(): Promise<UnitOfMeasure[]> {
    const res = await apiClient.get<any>('/master-data/uom?limit=1000');
    return extractList(res);
  },
  async createUOM(data: Partial<UnitOfMeasure>): Promise<UnitOfMeasure> {
    const res = await apiClient.post<{ success: boolean; data: UnitOfMeasure }>('/master-data/uom', data);
    return res.data.data;
  },
  async updateUOM(id: string, data: Partial<UnitOfMeasure>): Promise<UnitOfMeasure> {
    const res = await apiClient.put<{ success: boolean; data: UnitOfMeasure }>(`/master-data/uom/${id}`, data);
    return res.data.data;
  },
  async toggleUOMStatus(id: string): Promise<UnitOfMeasure> {
    const res = await apiClient.patch<{ success: boolean; data: UnitOfMeasure }>(`/master-data/uom/${id}`);
    return res.data.data;
  },
  async deleteUOM(id: string): Promise<void> {
    await apiClient.delete(`/master-data/uom/${id}`);
  },

  // Products
  async getProducts(extraParams?: string): Promise<Product[]> {
    const qs = extraParams ? `&${extraParams}` : '';
    const res = await apiClient.get<any>(`/master-data/products?limit=1000${qs}`);
    return extractList(res);
  },
  async createProduct(data: Partial<Product>): Promise<Product> {
    const res = await apiClient.post<{ success: boolean; data: Product }>('/master-data/products', data);
    return res.data.data;
  },
  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await apiClient.put<{ success: boolean; data: Product }>(`/master-data/products/${id}`, data);
    return res.data.data;
  },
  async toggleProductStatus(id: string): Promise<Product> {
    const res = await apiClient.patch<{ success: boolean; data: Product }>(`/master-data/products/${id}`);
    return res.data.data;
  },
  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/master-data/products/${id}`);
  },

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    const res = await apiClient.get<any>('/master-data/warehouses?limit=1000');
    return extractList(res);
  },
  async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    const res = await apiClient.post<{ success: boolean; data: Warehouse }>('/master-data/warehouses', data);
    return res.data.data;
  },
  async updateWarehouse(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
    const res = await apiClient.put<{ success: boolean; data: Warehouse }>(`/master-data/warehouses/${id}`, data);
    return res.data.data;
  },
  async toggleWarehouseStatus(id: string): Promise<Warehouse> {
    const res = await apiClient.patch<{ success: boolean; data: Warehouse }>(`/master-data/warehouses/${id}`);
    return res.data.data;
  },
  async deleteWarehouse(id: string): Promise<void> {
    await apiClient.delete(`/master-data/warehouses/${id}`);
  },

  // Recipes / BOM
  async getRecipes(): Promise<Recipe[]> {
    const res = await apiClient.get<any>('/master-data/recipes?limit=1000');
    return extractList(res);
  },
  async createRecipe(data: Partial<Recipe>): Promise<Recipe> {
    const res = await apiClient.post<{ success: boolean; data: Recipe }>('/master-data/recipes', data);
    return res.data.data;
  }
};

