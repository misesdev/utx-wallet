import React, { createContext, PropsWithChildren, useContext } from 'react';
import type { OfflineTransaction } from '../../core/domain/entities/OfflineTransaction';
import type { PrepareOfflineTxParams, ImportRawHexOptions } from '../../core/application/services/OfflineModeService';
import { OfflineModeService } from '../../core/application/services/OfflineModeService';

type OfflineModeContextValue = {
  prepareTransaction: (params: PrepareOfflineTxParams) => Promise<OfflineTransaction>;
  importRawHex: (walletId: string, rawHex: string, opts?: ImportRawHexOptions) => Promise<OfflineTransaction>;
  listTransactions: (walletId: string) => Promise<OfflineTransaction[]>;
  deleteTransaction: (id: string) => Promise<void>;
  broadcastTransaction: (tx: OfflineTransaction) => Promise<string>;
};

export const OfflineModeContext = createContext<OfflineModeContextValue | null>(null);

type OfflineModeProviderProps = PropsWithChildren<{
  service: OfflineModeService;
}>;

export function OfflineModeProvider({ children, service }: OfflineModeProviderProps) {
  const value: OfflineModeContextValue = {
    prepareTransaction: params => service.prepareTransaction(params),
    importRawHex: (walletId, rawHex, opts) => service.importRawHex(walletId, rawHex, opts),
    listTransactions: walletId => service.listTransactions(walletId),
    deleteTransaction: id => service.deleteTransaction(id),
    broadcastTransaction: tx => service.broadcastTransaction(tx),
  };

  return <OfflineModeContext.Provider value={value}>{children}</OfflineModeContext.Provider>;
}

export function useOfflineModeService(): OfflineModeContextValue {
  const ctx = useContext(OfflineModeContext);
  if (!ctx) throw new Error('useOfflineModeService must be used within OfflineModeProvider');
  return ctx;
}
