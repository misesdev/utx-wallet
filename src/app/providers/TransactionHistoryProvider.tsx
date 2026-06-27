import React, { createContext, PropsWithChildren, useContext } from 'react';
import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import type { Transaction } from '../../core/domain/entities/Transaction';
import type { TransactionDetail } from '../../core/domain/entities/TransactionDetail';
import type { RawTransaction } from '../../core/domain/repositories/BlockchainProvider';
import { TransactionHistoryService } from '../../core/application/services/TransactionHistoryService';

type TransactionHistoryContextValue = {
  getDetail: (tx: Transaction, network: BitcoinNetwork, walletId?: string) => Promise<TransactionDetail>;
  getRawTransaction: (txid: string, network: BitcoinNetwork) => Promise<RawTransaction>;
};

const TransactionHistoryContext = createContext<TransactionHistoryContextValue | null>(null);

type TransactionHistoryProviderProps = PropsWithChildren<{
  service: TransactionHistoryService;
}>;

export function TransactionHistoryProvider({ children, service }: TransactionHistoryProviderProps) {
  const value: TransactionHistoryContextValue = {
    getDetail: (tx, network, walletId) => service.getDetail(tx, network, walletId),
    getRawTransaction: (txid, network) => service.getRawTransaction(txid, network),
  };
  return (
    <TransactionHistoryContext.Provider value={value}>
      {children}
    </TransactionHistoryContext.Provider>
  );
}

export function useTransactionHistory(): TransactionHistoryContextValue {
  const ctx = useContext(TransactionHistoryContext);
  if (!ctx) throw new Error('useTransactionHistory must be used within TransactionHistoryProvider');
  return ctx;
}
