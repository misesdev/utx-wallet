import React, { createContext, PropsWithChildren, useContext } from 'react';
import type { RbfInfo } from '../../core/domain/entities/RbfInfo';
import type { GetRbfInfoParams, AccelerateTransactionParams } from '../../core/domain/usecases/transaction/AccelerateTransactionUseCase';
import type { BroadcastResult } from '../../core/domain/usecases/transaction/BroadcastTransactionUseCase';
import { AccelerateTransactionUseCase } from '../../core/domain/usecases/transaction/AccelerateTransactionUseCase';

type AccelerateContextValue = {
  getRbfInfo: (params: GetRbfInfoParams) => Promise<RbfInfo>;
  accelerate: (params: AccelerateTransactionParams) => Promise<BroadcastResult>;
};

export const AccelerateContext = createContext<AccelerateContextValue | null>(null);

type AccelerateProviderProps = PropsWithChildren<{
  useCase: AccelerateTransactionUseCase;
}>;

export function AccelerateProvider({ children, useCase }: AccelerateProviderProps) {
  const value: AccelerateContextValue = {
    getRbfInfo: (params: GetRbfInfoParams) => useCase.getRbfInfo(params),
    accelerate: (params: AccelerateTransactionParams) => useCase.execute(params),
  };

  return <AccelerateContext.Provider value={value}>{children}</AccelerateContext.Provider>;
}

export function useAccelerate(): AccelerateContextValue {
  const ctx = useContext(AccelerateContext);
  if (!ctx) throw new Error('useAccelerate must be used within AccelerateProvider');
  return ctx;
}
