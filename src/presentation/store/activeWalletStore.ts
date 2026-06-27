import { create } from 'zustand';
import type { Transaction } from '../../core/domain/entities/Transaction';
import type { Utxo } from '../../core/domain/entities/Utxo';
import type { SyncProgress } from '../../core/domain/usecases/wallet/SyncProgress';
import type { SyncResult } from '../../core/domain/usecases/wallet/SyncWalletUseCase';

/**
 * Store for the currently open wallet's data.
 *
 * Privacy design:
 * - This store is isolated to the single wallet that is open.
 * - Calling `clear()` wipes all data from memory (required when closing a wallet).
 * - No cross-wallet data is ever stored here — always clear before switching wallets.
 *
 * Synchronisation contract:
 * - DB is always the source of truth; the store is a reactive cache.
 * - After any sync or data mutation, the DB is updated first, then the store.
 * - Components subscribe to the store and receive updates automatically.
 */
type WalletData = {
  transactions: Transaction[];
  utxos: Utxo[];
  confirmedBalanceSats: number;
  pendingBalanceSats: number;
  isDataLoading: boolean;
};

type SyncState = {
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncResult: SyncResult | null;
  syncError: string | null;
  syncProgress: SyncProgress | null;
};

type ActiveWalletState = WalletData &
  SyncState & {
    walletId: string | null;
    setWalletId: (id: string | null) => void;
    setWalletData: (data: Partial<WalletData>) => void;
    setSyncState: (state: Partial<SyncState>) => void;
    /** Wipe all wallet data from memory — call when closing a wallet. */
    clear: () => void;
  };

const INITIAL_WALLET_DATA: WalletData = {
  transactions: [],
  utxos: [],
  confirmedBalanceSats: 0,
  pendingBalanceSats: 0,
  isDataLoading: false,
};

const INITIAL_SYNC_STATE: SyncState = {
  isSyncing: false,
  lastSyncAt: null,
  syncResult: null,
  syncError: null,
  syncProgress: null,
};

export const useActiveWalletStore = create<ActiveWalletState>(set => ({
  walletId: null,
  ...INITIAL_WALLET_DATA,
  ...INITIAL_SYNC_STATE,
  setWalletId: id => set({ walletId: id }),
  setWalletData: data => set(data),
  setSyncState: state => set(state),
  clear: () =>
    set({
      walletId: null,
      ...INITIAL_WALLET_DATA,
      ...INITIAL_SYNC_STATE,
    }),
}));
