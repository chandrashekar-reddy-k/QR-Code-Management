// @ts-nocheck

import React, { useEffect } from 'react';
import AdminCashManagementContent from './admin_cash_management/index';

/**
 * AdminCashManagement Entry Point
 * 
 * This component acts as the main entry point for the modularized Cash Management module.
 * All core logic has been moved to the /admin_cash_management directory for better maintainability.
 */
import { useSearchParams, useLocation } from 'react-router-dom';
import { useUserStore } from './store/userStore';
import BranchCashOverview from './admin_cash_management/BranchCashOverview';

export default function AdminCashManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');
  const user = useUserStore(s => s.user);
  const refreshUserProfile = useUserStore(s => s.refreshUserProfile);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      refreshUserProfile();
    }
  }, []);

  return <AdminCashManagementContent key={storeId || 'default'} />;
}
