import React, { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { clearAllSensitiveData } from '../../core/infrastructure/adapters/SensitiveDataStore';
import { WalletService } from '../../core/application/services/WalletService';
import { useWalletListStore } from '../../presentation/store/walletListStore';
import { useActiveWalletStore } from '../../presentation/store/activeWalletStore';
import type { Wallet } from '../../core/domain/entities/Wallet';
import type { Transaction } from '../../core/domain/entities/Transaction';
import type { Utxo } from '../../core/domain/entities/Utxo';
import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import type { SyncResult } from '../../core/domain/usecases/wallet/SyncWalletUseCase';
import type { SyncAccountResult } from '../../core/domain/usecases/wallet/SyncAccountUseCase';
import type { SyncAddressResult } from '../../core/domain/usecases/wallet/SyncAddressUseCase';
import type { OnSyncProgress } from '../../core/domain/usecases/wallet/SyncProgress';
import type {
  ExportWalletKeyParams,
  ExportWalletKeyResult,
  WalletExportFormat,
} from '../../core/domain/usecases/wallet/ExportWalletKeyUseCase';

type WalletContextValue = {
  wallets: Wallet[];
  isLoading: boolean;
  selectedWallet: Wallet | null;
  createWallet: (name: string) => Promise<Wallet>;
  importWallet: (name: string, secret: string, network?: BitcoinNetwork, passphrase?: string) => Promise<Wallet>;
  selectWallet: (id: string) => void;
  deleteWallet: (id: string) => Promise<void>;
  renameWallet: (id: string, name: string) => Promise<Wallet>;
  getWalletSeed: (walletId: string) => Promise<{ mnemonic: string; passphrase?: string } | null>;
  reloadWallets: () => Promise<void>;
  listTransactions: (walletId: string) => Promise<Transaction[]>;
  listUtxos: (walletId: string) => Promise<Utxo[]>;
  syncWallet: (walletId: string, onProgress?: OnSyncProgress) => Promise<SyncResult>;
  syncAccount: (walletId: string, originId: string, onProgress?: OnSyncProgress) => Promise<SyncAccountResult>;
  syncAddress: (walletId: string, address: string, onProgress?: OnSyncProgress) => Promise<SyncAddressResult>;
  freezeUtxo: (walletId: string, txid: string, vout: number) => Promise<void>;
  unfreezeUtxo: (walletId: string, txid: string, vout: number) => Promise<void>;
  exportWalletKey: (params: ExportWalletKeyParams) => Promise<ExportWalletKeyResult>;
  getExportFormats: (walletId: string) => Promise<WalletExportFormat[]>;
};

export const WalletContext = createContext<WalletContextValue | null>(null);

type WalletProviderProps = PropsWithChildren<{
  walletService: WalletService;
}>;

export function WalletProvider({ children, walletService }: WalletProviderProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  const { setWallets: setWalletListStore, setLoading: setWalletListLoading } = useWalletListStore();
  const { clear: clearActiveWallet } = useActiveWalletStore();

  const reloadWallets = useCallback(async () => {
    const loaded = await walletService.loadWallets();
    setWallets(loaded);
    setWalletListStore(loaded);
  }, [walletService, setWalletListStore]);

  useEffect(() => {
    setWalletListLoading(true);
    reloadWallets()
      .catch(() => { setWallets([]); setWalletListStore([]); })
      .finally(() => { setIsLoading(false); setWalletListLoading(false); });
  }, [reloadWallets, setWalletListLoading, setWalletListStore]);

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
      importWallet: async (name, secret, network, passphrase) => {
        const wallet = await walletService.importWallet(name, secret, network, passphrase);
        await reloadWallets();
        return wallet;
      },
      selectWallet: (id: string) => setSelectedWalletId(id),
      deleteWallet: async (id: string) => {
        await walletService.deleteWallet(id);
        clearAllSensitiveData();
        if (selectedWalletId === id) {
          clearActiveWallet();
          setSelectedWalletId(null);
        }
        await reloadWallets();
      },
      renameWallet: async (id: string, name: string) => {
        const wallet = await walletService.renameWallet(id, name);
        await reloadWallets();
        return wallet;
      },
      getWalletSeed: (walletId: string) => walletService.getWalletSeed(walletId),
      reloadWallets,
      listTransactions: (walletId: string) => walletService.listTransactions(walletId),
      listUtxos: (walletId: string) => walletService.listUtxos(walletId),
      syncWallet: async (walletId: string, onProgress?: OnSyncProgress) => {
        const result = await walletService.syncWallet(walletId, onProgress);
        await reloadWallets();
        return result;
      },
      syncAccount: (walletId: string, originId: string, onProgress?: OnSyncProgress) =>
        walletService.syncAccount(walletId, originId, onProgress),
      syncAddress: (walletId: string, address: string, onProgress?: OnSyncProgress) =>
        walletService.syncAddress(walletId, address, onProgress),
      freezeUtxo: (walletId, txid, vout) => walletService.freezeUtxo(walletId, txid, vout),
      unfreezeUtxo: (walletId, txid, vout) => walletService.unfreezeUtxo(walletId, txid, vout),
      exportWalletKey: (params) => walletService.exportWalletKey(params),
      getExportFormats: (walletId) => walletService.getExportFormats(walletId),
    }),
    [reloadWallets, wallets, isLoading, selectedWallet, selectedWalletId, walletService, clearActiveWallet],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
