import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  InventorySnapshot,
  StockLedgerEntry,
  Reservation,
  Transfer,
  GRN,
  CycleCount,
  Alert,
  Location,
  InventorySettings,
} from '../../types/inventory.types';
import { getInventoryStatus } from '../../lib/utils/inventory';

interface InventoryState {
  snapshots: InventorySnapshot[];
  ledger: StockLedgerEntry[];
  reservations: Reservation[];
  transfers: Transfer[];
  grns: GRN[];
  cycleCounts: CycleCount[];
  alerts: Alert[];
  locations: Location[];
  settings: InventorySettings;
}

const initialLocations: Location[] = [];

const initialState: InventoryState = {
  snapshots: [],
  ledger: [],
  reservations: [],
  transfers: [],
  grns: [],
  cycleCounts: [],
  alerts: [],
  locations: initialLocations,
  settings: {
    defaultSafetyStock: 10,
    defaultReorderPoint: 20,
  },
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setSnapshots: (state, action: PayloadAction<InventorySnapshot[]>) => {
      state.snapshots = action.payload;
    },
    setLedger: (state, action: PayloadAction<StockLedgerEntry[]>) => {
      state.ledger = action.payload;
    },
    setReservations: (state, action: PayloadAction<Reservation[]>) => {
      state.reservations = action.payload;
    },
    setTransfers: (state, action: PayloadAction<Transfer[]>) => {
      state.transfers = action.payload;
    },
    setGrns: (state, action: PayloadAction<GRN[]>) => {
      state.grns = action.payload;
    },
    setCycleCounts: (state, action: PayloadAction<CycleCount[]>) => {
      state.cycleCounts = action.payload;
    },
    setAlerts: (state, action: PayloadAction<Alert[]>) => {
      state.alerts = action.payload;
    },
    setSettings: (state, action: PayloadAction<InventorySettings>) => {
      state.settings = action.payload;
    },
    setLocations: (state, action: PayloadAction<Location[]>) => {
      state.locations = action.payload;
    },
    adjustStock: (
      state,
      action: PayloadAction<{
        variantId: string;
        locationCode: string;
        qtyChange: number;
        reason: string;
        reference?: string;
      }>
    ) => {
      const { variantId, locationCode, qtyChange, reason, reference } = action.payload;

      // Update snapshot
      const snapshotIndex = state.snapshots.findIndex(
        (s) => s.variantId === variantId && s.locationCode === locationCode
      );

      if (snapshotIndex !== -1) {
        state.snapshots[snapshotIndex].onHand += qtyChange;
      }

      // Add ledger entry
      const newLedgerEntry: StockLedgerEntry = {
        id: `ledger-${Date.now()}`,
        variantId,
        locationCode,
        dateTime: new Date().toISOString(),
        qtyChange,
        reason: reason as StockLedgerEntry['reason'],
        reference: reference || '',
        performedBy: 'Admin',
      };

      state.ledger.unshift(newLedgerEntry);
    },
    updateAlerts: (state) => {
      const newAlerts: Alert[] = [];

      state.snapshots.forEach((snapshot) => {
        const status = getInventoryStatus(snapshot);

        if (
          status.code === 'LOW_STOCK' ||
          status.code === 'OUT_OF_STOCK' ||
          status.code === 'NEGATIVE_STOCK'
        ) {
          // Check if alert already exists
          const existingAlert = state.alerts.find(
            (a) =>
              a.variantId === snapshot.variantId &&
              a.locationCode === snapshot.locationCode &&
              a.type === status.code &&
              a.status === 'Open'
          );

          if (!existingAlert) {
            newAlerts.push({
              id: `alert-${Date.now()}-${Math.random()}`,
              type: status.code,
              variantId: snapshot.variantId,
              sku: snapshot.sku,
              locationCode: snapshot.locationCode,
              description: `${snapshot.productName} (${snapshot.sku}) is ${status.label.toLowerCase()} at ${snapshot.locationName}`,
              createdAt: new Date().toISOString(),
              status: 'Open',
            });
          }
        }
      });

      // Merge with existing open alerts
      const existingOpenAlerts = state.alerts.filter((a) => a.status === 'Open');
      state.alerts = [...existingOpenAlerts, ...newAlerts];
    },
  },
});

export const {
  setSnapshots,
  setLedger,
  setReservations,
  setTransfers,
  setGrns,
  setCycleCounts,
  setAlerts,
  setSettings,
  setLocations,
  adjustStock,
  updateAlerts,
} = inventorySlice.actions;

export default inventorySlice.reducer;

