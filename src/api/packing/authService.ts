import apiClient from './axios';

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  role: string;
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
  async getOperators(): Promise<User[]> {
    const response = await apiClient.get<{ data: User[] }>('/auth/operators');
    return response.data.data;
  }
};
