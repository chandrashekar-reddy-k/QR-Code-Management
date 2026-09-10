// @ts-nocheck
import { useQuery, useQueryClient } from '@tanstack/react-query';
import adminAPI from '../services/adminService';
import * as routeService from '../services/routeService';

/**
 * High-speed React Query hook for Fleet Vehicles
 * Instant cache-first hydration (0ms render), silent background revalidation,
 * and synchronized with backend Redis caching.
 */
export function useVehiclesQuery(storeFilterId: string | null) {
  const storeKey = storeFilterId || 'all';

  return useQuery({
    queryKey: ['vsms', 'vehicles', storeKey],
    queryFn: async () => {
      const [vRes, uRes, sRes, stockRes, auditRes] = await Promise.all([
        adminAPI.getVehicles({ storeId: storeFilterId }),
        adminAPI.getVehicleAgents({ storeId: storeFilterId }),
        adminAPI.getStores(),
        adminAPI.getInventoryInit({ storeId: storeFilterId }),
        adminAPI.getAuditHistory({ storeId: storeFilterId })
      ]);

      const vehicleList = Array.isArray(vRes.data)
        ? vRes.data
        : vRes.data?.data || vRes.data?.vehicles || [];

      const fetchedStores = sRes.data?.success ? sRes.data.data : (sRes.data || []);
      const userList = Array.isArray(uRes.data)
        ? uRes.data
        : uRes.data?.data || uRes.data?.users || [];

      // Filter out Consumers AND Admins - only show agents/staff for vehicles
      const filteredUsers = userList.filter(
        (u: any) => u.role !== 'CONSUMER' && u.role !== 'ADMIN'
      );

      const items = stockRes.data?.items || [];
      const vehicleStock = stockRes.data?.vehicleStock || {};
      const auditHistory = auditRes.data || [];

      return {
        vehicles: vehicleList,
        stores: fetchedStores,
        users: filteredUsers,
        items,
        vehicleStock,
        auditHistory,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes fresh
    gcTime: 30 * 60 * 1000,    // 30 minutes in memory
    refetchOnWindowFocus: false,
  });
}

/**
 * High-speed React Query hook for Routes & Coverage
 * Instant cache-first hydration for Villages, Routes, and Route Assignments.
 */
export function useRoutesQuery(storeId: string | null) {
  const storeKey = storeId || 'all';

  return useQuery({
    queryKey: ['vsms', 'routes', storeKey],
    queryFn: async () => {
      const [vRes, rRes, aRes, vehRes, uRes, sRes] = await Promise.all([
        routeService.getVillages({ storeId }),
        routeService.getAdminRoutes({ storeId }),
        routeService.getRouteAssignments({ storeId }),
        adminAPI.getVehicles({ storeId }),
        adminAPI.getUsers({ storeId }),
        adminAPI.getStores()
      ]);

      const fetchedStores = sRes.data?.success ? sRes.data.data : (sRes.data || []);
      const rawVehicles = vehRes.data || [];
      const vehicleList = Array.isArray(rawVehicles) ? rawVehicles : rawVehicles?.data || [];

      const rawUsers = uRes.data || [];
      const userList = Array.isArray(rawUsers) ? rawUsers : rawUsers?.data || [];
      const filteredUsers = userList.filter((u: any) =>
        ['SALES_AGENT', 'VEHICLE_AGENT', 'DELIVERY_AGENT', 'SUPERVISOR', 'HELPER'].includes(u.role)
      );

      return {
        villages: Array.isArray(vRes) ? vRes : vRes?.data || [],
        routes: Array.isArray(rRes) ? rRes : rRes?.data || [],
        assignments: Array.isArray(aRes) ? aRes : aRes?.data || [],
        vehicles: vehicleList,
        users: filteredUsers,
        stores: fetchedStores,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes fresh
    gcTime: 30 * 60 * 1000,    // 30 minutes in memory
    refetchOnWindowFocus: false,
  });
}

import * as locationService from '../services/locationService';

/**
 * High-speed React Query hook for Route Performance Dashboard
 */
export function usePerformanceQuery(storeId: string | null) {
  const storeKey = storeId || 'all';

  return useQuery({
    queryKey: ['vsms', 'performance', storeKey],
    queryFn: async () => {
      const [perfRes, liveRes] = await Promise.all([
        routeService.getRoutePerformance({ storeId }),
        locationService.getLiveLocations(storeId)
      ]);
      return {
        performanceData: perfRes || { summary: { totalRoutes: 0, activeRoutes: 0, avgCompletion: 0, totalSales: 0 }, performance: [] },
        liveLocations: liveRes || [],
      };
    },
    staleTime: 60 * 1000,      // 1 minute fresh
    gcTime: 15 * 60 * 1000,    // 15 minutes in memory
    refetchOnWindowFocus: false,
  });
}

/**
 * High-speed React Query hook for Route Cash Collections
 */
export function useCollectionsQuery(storeId: string | null) {
  const storeKey = storeId || 'all';

  return useQuery({
    queryKey: ['vsms', 'collections', storeKey],
    queryFn: async () => {
      const res = await adminAPI.getFinancialReport({ storeId, type: 'collections' });
      const data = (res?.dailySheet || []).map((item: any) => ({
        agentName: item.user?.name || 'Unknown Agent',
        vehicleNumber: item.vehicle?.vehicleNumber || 'N/A',
        route: item.villageName || 'Active Route',
        expectedCash: item.expectedCash,
        collectedCash: item.actualCash,
        variance: item.difference,
        status: item.status
      }));
      return data;
    },
    staleTime: 2 * 60 * 1000,  // 2 minutes fresh
    gcTime: 15 * 60 * 1000,    // 15 minutes in memory
    refetchOnWindowFocus: false,
  });
}

/**
 * High-speed React Query hook for Sales Management
 * Instant cache-first hydration (0ms render) for Sales History, Stores, Users,
 * and Today's Session summary.
 */
export function useSalesQuery(storeFilterId: string | null, filterDate: string = 'Today') {
  const storeKey = storeFilterId || 'all';

  return useQuery({
    queryKey: ['vsms', 'sales', storeKey, filterDate],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (storeFilterId) params.storeId = storeFilterId;
      if (filterDate === 'Today') {
        params.fromDate = new Date().toISOString().split('T')[0];
      } else if (filterDate === 'This Week') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        params.fromDate = d.toISOString().split('T')[0];
      } else if (filterDate === 'This Month') {
        const d = new Date(); d.setDate(1);
        params.fromDate = d.toISOString().split('T')[0];
      }

      const [salesRes, storesRes, usersRes] = await Promise.allSettled([
        adminAPI.getSales(params),
        adminAPI.getStores(),
        adminAPI.getUsers()
      ]);

      let salesArray: any[] = [];
      if (salesRes.status === 'fulfilled') {
        const rawData = salesRes.value?.data;
        salesArray = Array.isArray(rawData) ? rawData : (rawData?.data ?? []);
      }

      let fetchedStores: any[] = [];
      if (storesRes.status === 'fulfilled') {
        const rawStores = storesRes.value?.data?.success
          ? storesRes.value.data.data
          : (storesRes.value?.data || []);
        fetchedStores = Array.isArray(rawStores) ? rawStores : [];
      }

      let userList: any[] = [];
      if (usersRes.status === 'fulfilled') {
        userList = usersRes.value?.data || [];
      }

      return {
        sales: salesArray,
        stores: fetchedStores,
        users: userList,
      };
    },
    staleTime: 3 * 60 * 1000,  // 3 minutes fresh
    gcTime: 30 * 60 * 1000,    // 30 minutes in memory
    refetchOnWindowFocus: false,
  });
}

/**
 * High-speed React Query hook for Inventory Loading History
 * Instant cache-first hydration (0ms render) for vehicle loading logs & sessions.
 */
export function useLoadHistoryQuery() {
  return useQuery({
    queryKey: ['vsms', 'load-history'],
    queryFn: async () => {
      const res = await adminAPI.getLoadHistory();
      const grouped: Record<string, any> = {};
      (res.data || []).forEach((item: any) => {
        const d = new Date(item.date);
        const timeKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${Math.floor(d.getMinutes() / 5)}`;
        const key = `${item.vehicleId}_${timeKey}`;
        if (!grouped[key]) {
          grouped[key] = {
            date: item.date,
            vehicle: item.vehicle,
            user: item.user,
            items: []
          };
        }
        grouped[key].items.push(item);
      });

      return Object.values(grouped).sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    staleTime: 3 * 60 * 1000,  // 3 minutes fresh
    gcTime: 30 * 60 * 1000,    // 30 minutes in memory
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to quickly invalidate VSMS caches after mutations
 */
export function useVsmsCacheInvalidator() {
  const queryClient = useQueryClient();

  return {
    invalidateSales: () => {
      return queryClient.invalidateQueries({ queryKey: ['vsms', 'sales'] });
    },
    invalidateVehicles: () => {
      return queryClient.invalidateQueries({ queryKey: ['vsms', 'vehicles'] });
    },
    invalidateRoutes: () => {
      return queryClient.invalidateQueries({ queryKey: ['vsms', 'routes'] });
    },
    invalidatePerformance: () => {
      return queryClient.invalidateQueries({ queryKey: ['vsms', 'performance'] });
    },
    invalidateCollections: () => {
      return queryClient.invalidateQueries({ queryKey: ['vsms', 'collections'] });
    },
    invalidateInventory: () => {
      return queryClient.invalidateQueries({ queryKey: ['vsms', 'load-history'] });
    },
    invalidateAllVsms: () => {
      return queryClient.invalidateQueries({ queryKey: ['vsms'] });
    }
  };
}


