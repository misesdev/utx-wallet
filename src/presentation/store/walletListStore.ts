import { create } from 'zustand';
import type { Wallet } from '../../core/domain/entities/Wallet';

/**
 * Global store for the wallet list.
 *
 * Privacy note: contains only wallet metadata (name, id, network, status).
 * Sensitive data (keys, seeds, balances, transactions) must never live here.
 */
type WalletListState = {
  wallets: Wallet[];
  isLoading: boolean;
  setWallets: (wallets: Wallet[]) => void;
  setLoading: (loading: boolean) => void;
};

export const useWalletListStore = create<WalletListState>(set => ({
  wallets: [],
  isLoading: true,
  setWallets: wallets => set({ wallets }),
  setLoading: isLoading => set({ isLoading }),
}));
