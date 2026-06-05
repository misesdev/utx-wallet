import React, { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { WalletService } from '../../core/application/services/WalletService';
import type { Wallet } from '../../core/domain/entities/Wallet';

type WalletContextValue = {
  wallets: Wallet[];
  isLoading: boolean;
  selectedWallet: Wallet | null;
  createWallet: (name: string) => Promise<Wallet>;
  importWallet: (name: string, secret: string) => Promise<Wallet>;
  reloadWallets: () => Promise<void>;
};

export const WalletContext = createContext<WalletContextValue | null>(null);

type WalletProviderProps = PropsWithChildren<{
  walletService: WalletService;
}>;

export function WalletProvider({ children, walletService }: WalletProviderProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reloadWallets = useCallback(async () => {
    setWallets(await walletService.loadWallets());
  }, [walletService]);

  useEffect(() => {
    reloadWallets()
      .catch(() => setWallets([]))
      .finally(() => setIsLoading(false));
  }, [reloadWallets]);

  const value = useMemo<WalletContextValue>(
    () => ({
      wallets,
      isLoading,
      selectedWallet: wallets[0] ?? null,
      createWallet: async name => {
        const wallet = await walletService.createWallet(name);
        await reloadWallets();
        return wallet;
      },
      importWallet: async (name, secret) => {
        const wallet = await walletService.importWallet(name, secret);
        await reloadWallets();
        return wallet;
      },
      reloadWallets,
    }),
    [reloadWallets, wallets, isLoading, walletService],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
