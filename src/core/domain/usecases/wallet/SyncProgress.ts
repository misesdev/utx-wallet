export type SyncPhase = 'utxos' | 'transactions';

export type SyncProgress = {
  currentAddress: string;
  currentIndex: number;
  totalAddresses: number;
  phase: SyncPhase;
  /** Set by SyncWalletUseCase so the UI can show which account is being synced. */
  accountName?: string;
};

export type OnSyncProgress = (progress: SyncProgress) => void;
