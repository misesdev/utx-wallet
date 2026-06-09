import { SyncUtxosUseCase } from '../../../src/core/domain/usecases/wallet/SyncUtxosUseCase';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { UtxoRepository } from '../../../src/core/domain/repositories/UtxoRepository';
import type { BlockchainProvider } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';

const WALLET_ID = 'wallet-1';
const ADDRESS = 'tb1qtest';
const NETWORK = 'testnet4' as const;

function makeUtxo(txid: string, vout = 0, valueSats = 100_000, isConfirmed = true): Utxo {
  return { txid, vout, valueSats, address: ADDRESS, isConfirmed };
}

function makeRepo(localUtxos: Utxo[] = []): jest.Mocked<UtxoRepository> {
  return {
    listByWallet: jest.fn().mockResolvedValue(localUtxos),
    replaceAll: jest.fn().mockResolvedValue(undefined),
    freeze: jest.fn().mockResolvedValue(undefined),
    unfreeze: jest.fn().mockResolvedValue(undefined),
    deleteByWallet: jest.fn().mockResolvedValue(undefined),
  };
}

function makeProvider(freshUtxos: Utxo[] = []): jest.Mocked<BlockchainProvider> {
  return {
    getUtxos: jest.fn().mockResolvedValue(freshUtxos),
    getBalance: jest.fn(),
    getTransactions: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
    getRawTransaction: jest.fn(),
  };
}

describe('SyncUtxosUseCase', () => {
  describe('new UTXOs', () => {
    it('detects UTXOs present in blockchain but not in local cache', async () => {
      const fresh = [makeUtxo('tx1'), makeUtxo('tx2')];
      const useCase = new SyncUtxosUseCase(makeRepo([]), makeProvider(fresh));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.newCount).toBe(2);
      expect(result.spentCount).toBe(0);
    });

    it('replaces local UTXOs with fresh data from blockchain', async () => {
      const fresh = [makeUtxo('tx1')];
      const repo = makeRepo([]);
      const useCase = new SyncUtxosUseCase(repo, makeProvider(fresh));
      await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(repo.replaceAll).toHaveBeenCalledWith(WALLET_ID, fresh);
    });

    it('counts only truly new UTXOs (not already in local)', async () => {
      const local = [makeUtxo('tx1')];
      const fresh = [makeUtxo('tx1'), makeUtxo('tx2')]; // tx1 exists, tx2 is new
      const useCase = new SyncUtxosUseCase(makeRepo(local), makeProvider(fresh));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.newCount).toBe(1);
    });
  });

  describe('spent UTXOs', () => {
    it('detects UTXOs present locally but absent from blockchain (spent)', async () => {
      const local = [makeUtxo('tx1'), makeUtxo('tx2')];
      const fresh: Utxo[] = []; // both spent
      const useCase = new SyncUtxosUseCase(makeRepo(local), makeProvider(fresh));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.spentCount).toBe(2);
      expect(result.newCount).toBe(0);
    });

    it('identifies partial spend correctly', async () => {
      const local = [makeUtxo('tx1'), makeUtxo('tx2')];
      const fresh = [makeUtxo('tx2'), makeUtxo('tx3')]; // tx1 spent, tx3 new
      const useCase = new SyncUtxosUseCase(makeRepo(local), makeProvider(fresh));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.spentCount).toBe(1);
      expect(result.newCount).toBe(1);
    });

    it('still replaces local UTXOs even when all are spent', async () => {
      const local = [makeUtxo('tx1')];
      const repo = makeRepo(local);
      const useCase = new SyncUtxosUseCase(repo, makeProvider([]));
      await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(repo.replaceAll).toHaveBeenCalledWith(WALLET_ID, []);
    });
  });

  describe('no changes', () => {
    it('returns zero counts when local and fresh are identical', async () => {
      const utxos = [makeUtxo('tx1'), makeUtxo('tx2')];
      const useCase = new SyncUtxosUseCase(makeRepo(utxos), makeProvider(utxos));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.newCount).toBe(0);
      expect(result.spentCount).toBe(0);
    });

    it('handles empty local cache and empty blockchain response', async () => {
      const useCase = new SyncUtxosUseCase(makeRepo([]), makeProvider([]));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.newCount).toBe(0);
      expect(result.spentCount).toBe(0);
    });
  });

  describe('error handling', () => {
    it('throws and does not call replaceAll when blockchain provider fails', async () => {
      const repo = makeRepo([makeUtxo('tx1')]);
      const provider = makeProvider([]);
      provider.getUtxos.mockRejectedValue(new AppError('Request timed out', 'TIMEOUT'));
      const useCase = new SyncUtxosUseCase(repo, provider);
      await expect(useCase.execute(WALLET_ID, [ADDRESS], NETWORK)).rejects.toMatchObject({ code: 'TIMEOUT' });
      expect(repo.replaceAll).not.toHaveBeenCalled();
    });

    it('throws when local repository read fails', async () => {
      const repo = makeRepo([]);
      repo.listByWallet.mockRejectedValue(new AppError('DB error', 'DB_NOT_INITIALIZED'));
      const useCase = new SyncUtxosUseCase(repo, makeProvider([]));
      await expect(useCase.execute(WALLET_ID, [ADDRESS], NETWORK)).rejects.toMatchObject({ code: 'DB_NOT_INITIALIZED' });
    });
  });

  describe('vout disambiguation', () => {
    it('uses txid:vout composite key so same txid different vout are distinct UTXOs', async () => {
      const local = [makeUtxo('tx1', 0), makeUtxo('tx1', 1)];
      const fresh = [makeUtxo('tx1', 0), makeUtxo('tx1', 2)]; // vout 1 spent, vout 2 new
      const useCase = new SyncUtxosUseCase(makeRepo(local), makeProvider(fresh));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.spentCount).toBe(1);
      expect(result.newCount).toBe(1);
    });
  });

  describe('multiple addresses', () => {
    it('aggregates UTXOs from all addresses into a single replaceAll call', async () => {
      const ADDR_B = 'tb1qaddr2';
      const utxo0 = makeUtxo('tx1');
      const utxo1 = { ...makeUtxo('tx2'), address: ADDR_B };
      const repo = makeRepo([]);
      const provider = makeProvider([]);
      provider.getUtxos
        .mockResolvedValueOnce([utxo0])   // ADDRESS
        .mockResolvedValueOnce([utxo1]);  // ADDR_B
      const useCase = new SyncUtxosUseCase(repo, provider);
      const result = await useCase.execute(WALLET_ID, [ADDRESS, ADDR_B], NETWORK);
      expect(result.newCount).toBe(2);
      expect(repo.replaceAll).toHaveBeenCalledWith(WALLET_ID, [utxo0, utxo1]);
      expect(repo.replaceAll).toHaveBeenCalledTimes(1);
    });

    it('calls getUtxos once per address', async () => {
      const ADDR_B = 'tb1qaddr2';
      const provider = makeProvider([]);
      const useCase = new SyncUtxosUseCase(makeRepo([]), provider);
      await useCase.execute(WALLET_ID, [ADDRESS, ADDR_B], NETWORK);
      expect(provider.getUtxos).toHaveBeenCalledTimes(2);
      expect(provider.getUtxos).toHaveBeenCalledWith(ADDRESS, NETWORK);
      expect(provider.getUtxos).toHaveBeenCalledWith(ADDR_B, NETWORK);
    });
  });
});
