export type SortDirection = 'asc' | 'desc' | null;
export type SortField = string | null;

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

