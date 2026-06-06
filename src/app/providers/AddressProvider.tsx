import React, { createContext, PropsWithChildren, useContext } from 'react';
import type { Address } from '../../core/domain/entities/Address';
import { AddressService } from '../../core/application/services/AddressService';

type AddressContextValue = {
  getCurrentReceiveAddress: (walletId: string) => Promise<Address>;
  generateNewReceiveAddress: (walletId: string) => Promise<Address>;
  markAddressUsed: (addressValue: string) => Promise<void>;
};

export const AddressContext = createContext<AddressContextValue | null>(null);

type AddressProviderProps = PropsWithChildren<{
  addressService: AddressService;
}>;

export function AddressProvider({ children, addressService }: AddressProviderProps) {
  const value: AddressContextValue = {
    getCurrentReceiveAddress: (walletId: string) =>
      addressService.getCurrentReceiveAddress(walletId),
    generateNewReceiveAddress: (walletId: string) =>
      addressService.generateNewReceiveAddress(walletId),
    markAddressUsed: (addressValue: string) => addressService.markAddressUsed(addressValue),
  };

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddress(): AddressContextValue {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error('useAddress must be used within AddressProvider');
  return ctx;
}
