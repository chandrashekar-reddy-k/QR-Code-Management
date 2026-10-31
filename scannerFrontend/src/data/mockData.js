// src/data/mockData.js
// Default schema configurations, initial hubs and setting structures for VillagKart QR Studio.

export const INITIAL_HUBS = [
  { id: '9f337243-9b4c-4fb1-9ce5-05ed5a2acfb8', name: 'Phirangipuram Warehouse', region: 'Andhra Pradesh' },
  { id: '9f4a90b9-dc35-423f-b78c-e96c248b72d4', name: "Raidurg's Warehouse", region: 'Telangana' },
  { id: '2df5a849-371a-4999-a4b9-f2d0daad5249', name: 'Test Warehouse', region: 'Andhra Pradesh' },
];

export const INITIAL_SETTINGS = {
  defaultRedirectDomain: 'villagkart.com',
  defaultExportFormat: 'SVG',
  trackingEnabled: true,
  conversionAttributionWindow: 30,
  rateLimitScansPerMinute: 1000,
};

export const INITIAL_QR_CODES = [];
export const INITIAL_CAMPAIGNS = [];
export const INITIAL_SCAN_EVENTS = [];
export const INITIAL_APPROVALS = [];
export const INITIAL_AUDIT_LOGS = [];
export const INITIAL_TEMPLATES = [];
