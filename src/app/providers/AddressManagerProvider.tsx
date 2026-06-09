import React, { createContext, PropsWithChildren, useContext } from 'react';
import type { AddressOrigin } from '../../core/domain/entities/AddressOrigin';
import type { WalletAddress } from '../../core/domain/entities/WalletAddress';
import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import { AddressManagerService } from '../../core/application/services/AddressManagerService';

type AddressManagerContextValue = {
  getOrigins: (walletId: string) => Promise<AddressOrigin[]>;
  createAddressOrigin: (walletId: string, name: string, network: BitcoinNetwork) => Promise<AddressOrigin>;
  renameAddressOrigin: (originId: string, name: string) => Promise<AddressOrigin>;
  getReceiveAddress: (walletId: string, network: BitcoinNetwork, originId?: string, reserve?: boolean) => Promise<WalletAddress>;
  getChangeAddress: (walletId: string, network: BitcoinNetwork, originId?: string, reserve?: boolean) => Promise<WalletAddress>;
  ensureAddressPool: (walletId: string, network: BitcoinNetwork) => Promise<void>;
  listAddresses: (walletId: string) => Promise<WalletAddress[]>;
};

export const AddressManagerContext = createContext<AddressManagerContextValue | null>(null);

type Props = PropsWithChildren<{ service: AddressManagerService }>;

export function AddressManagerProvider({ children, service }: Props) {
  const value: AddressManagerContextValue = {
    getOrigins: (walletId) => service.getOrigins(walletId),
    createAddressOrigin: (walletId, name, network) => service.createAddressOrigin(walletId, name, network),
    renameAddressOrigin: (originId, name) => service.renameAddressOrigin(originId, name),
    getReceiveAddress: (walletId, network, originId, reserve) =>
      service.getReceiveAddress(walletId, network, originId, reserve),
    getChangeAddress: (walletId, network, originId, reserve) =>
      service.getChangeAddress(walletId, network, originId, reserve),
    ensureAddressPool: (walletId, network) => service.ensureAddressPool(walletId, network),
    listAddresses: (walletId) => service.listAddresses(walletId),
  };

  return (
    <AddressManagerContext.Provider value={value}>
      {children}
    </AddressManagerContext.Provider>
  );
}

export function useAddressManager(): AddressManagerContextValue {
  const ctx = useContext(AddressManagerContext);
  if (!ctx) throw new Error('useAddressManager must be used within AddressManagerProvider');
  return ctx;
}
