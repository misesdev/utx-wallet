import { useContext } from 'react';
import { CreateWalletContext } from '../../app/providers/CreateWalletProvider';

export function useCreateWallet() {
  const ctx = useContext(CreateWalletContext);
  if (!ctx) {
    throw new Error('useCreateWallet must be used within CreateWalletProvider');
  }
  return ctx;
}
