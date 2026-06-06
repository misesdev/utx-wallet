import React, { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { WalletService } from '../../core/application/services/WalletService';
import type { Wallet } from '../../core/domain/entities/Wallet';
import type { Transaction } from '../../core/domain/entities/Transaction';
import type { Utxo } from '../../core/domain/entities/Utxo';
import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import type { SyncResult } from '../../core/domain/usecases/wallet/SyncWalletUseCase';

type WalletContextValue = {
  wallets: Wallet[];
  isLoading: boolean;
  selectedWallet: Wallet | null;
  createWallet: (name: string) => Promise<Wallet>;
  importWallet: (name: string, secret: string, network?: BitcoinNetwork) => Promise<Wallet>;
  selectWallet: (id: string) => void;
  deleteWallet: (id: string) => Promise<void>;
  reloadWallets: () => Promise<void>;
  listTransactions: (walletId: string) => Promise<Transaction[]>;
  listUtxos: (walletId: string) => Promise<Utxo[]>;
  syncWallet: (walletId: string) => Promise<SyncResult>;
  freezeUtxo: (walletId: string, txid: string, vout: number) => Promise<void>;
  unfreezeUtxo: (walletId: string, txid: string, vout: number) => Promise<void>;
};

export const WalletContext = createContext<WalletContextValue | null>(null);

type WalletProviderProps = PropsWithChildren<{
  walletService: WalletService;
}>;

export function WalletProvider({ children, walletService }: WalletProviderProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  const reloadWallets = useCallback(async () => {
    setWallets(await walletService.loadWallets());
  }, [walletService]);

  useEffect(() => {
    reloadWallets()
      .catch(() => setWallets([]))
      .finally(() => setIsLoading(false));
  }, [reloadWallets]);

  const selectedWallet = useMemo(
    () =>
      (selectedWalletId ? wallets.find(w => w.id === selectedWalletId) : null) ??
      wallets[0] ??
      null,
    [wallets, selectedWalletId],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      wallets,
      isLoading,
      selectedWallet,
      createWallet: async name => {
        const wallet = await walletService.createWallet(name);
        await reloadWallets();
        return wallet;
      },
      importWallet: async (name, secret, network) => {
        const wallet = await walletService.importWallet(name, secret, network);
        await reloadWallets();
        return wallet;
      },
      selectWallet: (id: string) => setSelectedWalletId(id),
      deleteWallet: async (id: string) => {
        await walletService.deleteWallet(id);
        if (selectedWalletId === id) setSelectedWalletId(null);
        await reloadWallets();
      },
      reloadWallets,
      listTransactions: (walletId: string) => walletService.listTransactions(walletId),
      listUtxos: (walletId: string) => walletService.listUtxos(walletId),
      syncWallet: (walletId: string) => walletService.syncWallet(walletId),
      freezeUtxo: (walletId, txid, vout) => walletService.freezeUtxo(walletId, txid, vout),
      unfreezeUtxo: (walletId, txid, vout) => walletService.unfreezeUtxo(walletId, txid, vout),
    }),
    [reloadWallets, wallets, isLoading, selectedWallet, selectedWalletId, walletService],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
