import React, { createContext, PropsWithChildren, useContext } from 'react';
import type { FeeRates } from '../../core/domain/repositories/BlockchainProvider';
import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import type { TransactionPreview } from '../../core/domain/entities/TransactionPreview';
import type { PreviewTransactionParams } from '../../core/domain/usecases/transaction/PreviewTransactionUseCase';
import type { BroadcastResult } from '../../core/domain/usecases/transaction/BroadcastTransactionUseCase';
import type { SendTransactionParams } from '../../core/application/services/SendService';
import { SendService } from '../../core/application/services/SendService';

type SendContextValue = {
  validateAddress: (address: string) => { valid: boolean; error: string | null };
  fetchFeeRates: (network: BitcoinNetwork) => Promise<FeeRates>;
  preview: (params: PreviewTransactionParams) => Promise<TransactionPreview>;
  send: (params: SendTransactionParams) => Promise<BroadcastResult>;
};

export const SendContext = createContext<SendContextValue | null>(null);

type SendProviderProps = PropsWithChildren<{
  sendService: SendService;
}>;

export function SendProvider({ children, sendService }: SendProviderProps) {
  const value: SendContextValue = {
    validateAddress: (address: string) => sendService.validateAddress(address),
    fetchFeeRates: (network) => sendService.fetchFeeRates(network),
    preview: (params: PreviewTransactionParams) => sendService.preview(params),
    send: (params: SendTransactionParams) => sendService.send(params),
  };

  return <SendContext.Provider value={value}>{children}</SendContext.Provider>;
}

export function useSend(): SendContextValue {
  const ctx = useContext(SendContext);
  if (!ctx) throw new Error('useSend must be used within SendProvider');
  return ctx;
}
