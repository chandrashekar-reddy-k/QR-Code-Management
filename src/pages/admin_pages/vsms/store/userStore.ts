// @ts-nocheck
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { URL as configURL } from '../../../../config';

const fetchMe = async () => {
  const token = localStorage.getItem('partnerToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
  if (!token) return null;
  const baseURL = configURL || '';
  const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const { data } = await axios.get(`${cleanBaseURL}/vsms/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: (() => {
        try {
          const u = localStorage.getItem('partnerUser') || localStorage.getItem('user');
          if (u) {
            const parsed = JSON.parse(u);
            return {
              ...parsed,
              storeId: parsed.storeId || parsed.warehouseId || null
            };
          }
        } catch {}
        return null;
      })(),
      token: localStorage.getItem('partnerToken') || localStorage.getItem('token') || localStorage.getItem('authToken') || null,

      setUser: (user, token) => {
        if (token) {
          localStorage.setItem('partnerToken', token);
          localStorage.setItem('token', token);
        }
        set({ user, token: token || get().token });
      },

      refreshUserProfile: async () => {
        const token = localStorage.getItem('partnerToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token) return;
        try {
          const data = await fetchMe();
          if (!data) return;
          set({
            user: {
              ...data,
              permissions: data.customRole?.permissions || data.permissions || null,
              customRoleName: data.customRoleName || data.customRole?.name || null,
              portalType: data.portalType || data.customRole?.portalType || null,
              customRoleId: data.customRoleId || data.customRole?.id || null,
              storeId: data.storeId || data.warehouseId || null,
            }
          });
        } catch (error) {
          console.error('Failed to refresh user profile:', error);
        }
      },

      updateUserProfile: async (formData) => {
        try {
          const { data } = await api.put('/auth/me', formData);
          if (data.success) {
            set((state) => ({
              user: state.user ? { ...state.user, name: data.data.name, avatar: data.data.avatar } : data.data
            }));
            return data;
          }
        } catch (error) {
          console.error('Failed to update user profile:', error);
          throw error;
        }
      },

      updateBusinessProfile: async (formData) => {
        try {
          const { data } = await api.put('/auth/me', formData);
          if (data.success) {
            await get().refreshUserProfile();
            return data;
          }
        } catch (error) {
          console.error('Failed to update business profile:', error);
          throw error;
        }
      },

      can: (module, action = 'READ', section) => {
        const user = get().user;
        if (!user) return false;

        // Super Admins, Tenant Owners, Global Admins, Partners, or Users without customRoleId bypass all permission gates
        if (
          user.role === 'SUPER_ADMIN' ||
          user.role === 'TENANT_OWNER' ||
          user.role === 'PARTNER' ||
          user.role === 'SHOPKEEPER' ||
          (user.role === 'ADMIN' && !user.customRoleId) ||
          user.portalType === 'ADMIN'
        ) {
          return true;
        }

        // If section is provided (e.g., 'VILLAGES', 'ROUTES', 'ASSIGNMENTS'), check ROUTE_TARGET_SECTIONS permission list
        if (section && user.permissions?.ROUTE_TARGET_SECTIONS && Array.isArray(user.permissions.ROUTE_TARGET_SECTIONS)) {
          if (user.permissions.ROUTE_TARGET_SECTIONS.includes(section)) return true;
        }

        // Evaluate permissions map
        if (!user.permissions || typeof user.permissions !== 'object') {
          return false;
        }

        const modName = module ? String(module).toUpperCase() : '';
        const baseModule = modName.endsWith('S') ? modName.slice(0, -1) : modName;

        const perms = user.permissions[modName] || 
                      user.permissions[baseModule] || 
                      user.permissions[`${baseModule}S`] || 
                      [];

        if (Array.isArray(perms)) {
          if (perms.includes('ALL') || perms.includes('*')) return true;
          return perms.includes(action);
        }

        return false;
      },

      clearUser: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'vsms-user-storage',
    }
  )
);

// Expose getState for non-component files (like api.js interceptor)
// This is already provided by zustand's create() automatically via useUserStore.getState()
