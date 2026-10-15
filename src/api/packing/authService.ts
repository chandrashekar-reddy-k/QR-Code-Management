import apiClient from './axios';

export interface User {
  id: string;
  email?: string | null;
  name: string;
  roleId?: string;
  role: string;
  phone?: string | null;
  warehouseId?: string | null;
  approvalStatus?: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },
  async getOperators(params?: { roleOnly?: boolean }): Promise<User[]> {
    const response = await apiClient.get<any>('/auth/operators', { params });
    const result = response.data?.data || response.data;
    return Array.isArray(result) ? result : [];
  }
};
