import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { WalletProvider, WalletContext } from '../../../src/app/providers/WalletProvider';
import { useContext } from 'react';
import { stashSensitiveData, popSensitiveData } from '../../../src/core/infrastructure/adapters/SensitiveDataStore';
import type { WalletService } from '../../../src/core/application/services/WalletService';

function makeWalletService(overrides: Partial<WalletService> = {}): WalletService {
  return {
    loadWallets: jest.fn().mockResolvedValue([]),
    createWallet: jest.fn(),
    importWallet: jest.fn(),
    deleteWallet: jest.fn().mockResolvedValue(undefined),
    renameWallet: jest.fn(),
    getWalletSeed: jest.fn(),
    listTransactions: jest.fn(),
    listUtxos: jest.fn(),
    syncWallet: jest.fn(),
    syncAccount: jest.fn(),
    syncAddress: jest.fn(),
    freezeUtxo: jest.fn(),
    unfreezeUtxo: jest.fn(),
    exportWalletKey: jest.fn(),
    getExportFormats: jest.fn(),
    ...overrides,
  } as unknown as WalletService;
}

function makeWrapper(service: WalletService) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return <WalletProvider walletService={service}>{children}</WalletProvider>;
  };
}

describe('WalletProvider', () => {
  describe('deleteWallet', () => {
    it('calls the wallet service delete', async () => {
      const service = makeWalletService();
      const { result } = renderHook(
        () => useContext(WalletContext),
        { wrapper: makeWrapper(service) },
      );
      await act(async () => {
        await result.current?.deleteWallet('wallet-1');
      });
      expect(service.deleteWallet).toHaveBeenCalledWith('wallet-1');
    });

    it('clears all sensitive data from the in-memory store after deletion', async () => {
      const service = makeWalletService();
      const { result } = renderHook(
        () => useContext(WalletContext),
        { wrapper: makeWrapper(service) },
      );

      const key = stashSensitiveData('super-secret-mnemonic');

      await act(async () => {
        await result.current?.deleteWallet('wallet-1');
      });

      // After deletion the store is wiped — stashed value is no longer retrievable
      expect(popSensitiveData(key)).toBeUndefined();
    });

    it('does not clear sensitive data when wallet service deletion fails', async () => {
      const service = makeWalletService({
        deleteWallet: jest.fn().mockRejectedValue(new Error('storage error')),
      });
      const { result } = renderHook(
        () => useContext(WalletContext),
        { wrapper: makeWrapper(service) },
      );

      const key = stashSensitiveData('at-risk-seed');
      await act(async () => {
        await result.current?.deleteWallet('wallet-x').catch(() => undefined);
      });

      // Deletion failed — wallet still exists, store should NOT be cleared
      expect(popSensitiveData(key)).toBe('at-risk-seed');
    });
  });
});
