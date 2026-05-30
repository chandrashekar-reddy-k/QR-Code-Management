import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
  setSnapshots,
  setLedger,
  setReservations,
  setTransfers,
  setGrns,
  setCycleCounts,
  setAlerts,
  setSettings,
  adjustStock,
  updateAlerts,
} from '../redux/slices/inventorySlice';
import {
  InventorySnapshot,
  StockLedgerEntry,
  Reservation,
  Transfer,
  GRN,
  CycleCount,
  Alert,
  InventorySettings,
} from '../types/inventory.types';

// Compatibility hook - maintains same API as old useInventory
export const useInventory = () => {
  const dispatch = useAppDispatch();
  const inventory = useAppSelector((state) => state.inventory);

  return {
    snapshots: inventory.snapshots,
    ledger: inventory.ledger,
    reservations: inventory.reservations,
    transfers: inventory.transfers,
    grns: inventory.grns,
    cycleCounts: inventory.cycleCounts,
    alerts: inventory.alerts,
    locations: inventory.locations,
    settings: inventory.settings,
    setSnapshots: (snapshots: InventorySnapshot[]) => dispatch(setSnapshots(snapshots)),
    setLedger: (ledger: StockLedgerEntry[]) => dispatch(setLedger(ledger)),
    setReservations: (reservations: Reservation[]) => dispatch(setReservations(reservations)),
    setTransfers: (transfers: Transfer[]) => dispatch(setTransfers(transfers)),
    setGrns: (grns: GRN[]) => dispatch(setGrns(grns)),
    setCycleCounts: (cycleCounts: CycleCount[]) => dispatch(setCycleCounts(cycleCounts)),
    setAlerts: (alerts: Alert[]) => dispatch(setAlerts(alerts)),
    setSettings: (settings: InventorySettings) => dispatch(setSettings(settings)),
    adjustStock: (
      variantId: string,
      locationCode: string,
      qtyChange: number,
      reason: string,
      reference?: string
    ) => {
      dispatch(adjustStock({ variantId, locationCode, qtyChange, reason, reference }));
    },
    updateAlerts: () => {
      dispatch(updateAlerts());
    },
  };
};

