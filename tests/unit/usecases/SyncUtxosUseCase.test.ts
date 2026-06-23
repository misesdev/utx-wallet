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

    it('preserves local frozen state for refreshed UTXOs with the same txid and vout', async () => {
      const local = [{ ...makeUtxo('tx1'), isFrozen: true }];
      const fresh = [makeUtxo('tx1')];
      const repo = makeRepo(local);
      const useCase = new SyncUtxosUseCase(repo, makeProvider(fresh));

      await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);

      expect(repo.replaceAll).toHaveBeenCalledWith(WALLET_ID, [
        expect.objectContaining({ txid: 'tx1', vout: 0, isFrozen: true }),
      ]);
    });

    it('does not copy frozen state to a different vout from the same txid', async () => {
      const local = [{ ...makeUtxo('tx1', 0), isFrozen: true }];
      const fresh = [makeUtxo('tx1', 1)];
      const repo = makeRepo(local);
      const useCase = new SyncUtxosUseCase(repo, makeProvider(fresh));

      await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);

      expect(repo.replaceAll).toHaveBeenCalledWith(WALLET_ID, [
        expect.objectContaining({ txid: 'tx1', vout: 1, isFrozen: undefined }),
      ]);
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

  describe('stale UTXO verification (shared private key / multi-device)', () => {
    it('fetches UTXOs for non-primary addresses that have stored UTXOs', async () => {
      // ADDR_B is NOT in the primary sync batch but has a stored UTXO.
      // Another device may have spent it — we must query the blockchain to know.
      const ADDR_B = 'tb1qother';
      const staleUtxo: Utxo = { txid: 'stale-tx', vout: 0, valueSats: 50_000, address: ADDR_B, isConfirmed: true };
      const local = [makeUtxo('tx1'), staleUtxo];
      const repo = makeRepo(local);
      const provider = makeProvider([]);
      provider.getUtxos
        .mockResolvedValueOnce([makeUtxo('tx1')]) // ADDRESS (primary)
        .mockResolvedValueOnce([]);               // ADDR_B (verify): UTXO was spent on other device
      const useCase = new SyncUtxosUseCase(repo, provider);
      await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);

      expect(provider.getUtxos).toHaveBeenCalledWith(ADDR_B, NETWORK);
    });

    it('removes stale UTXOs from non-primary addresses that were spent on another device', async () => {
      const ADDR_B = 'tb1qother';
      const staleUtxo: Utxo = { txid: 'stale-tx', vout: 0, valueSats: 50_000, address: ADDR_B, isConfirmed: true };
      const local = [makeUtxo('tx1'), staleUtxo];
      const repo = makeRepo(local);
      const provider = makeProvider([]);
      provider.getUtxos
        .mockResolvedValueOnce([makeUtxo('tx1')]) // ADDRESS (primary): still present
        .mockResolvedValueOnce([]);               // ADDR_B (verify): spent — nothing returned
      const useCase = new SyncUtxosUseCase(repo, provider);
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);

      const [, savedUtxos]: [string, Utxo[]] = (repo.replaceAll as jest.Mock).mock.calls[0];
      expect(savedUtxos.some(u => u.txid === 'stale-tx')).toBe(false);
      expect(savedUtxos.some(u => u.txid === 'tx1')).toBe(true);
      // spentCount only reflects primary-address spends, not verify removals
      expect(result.spentCount).toBe(0);
    });

    it('preserves non-primary UTXOs that are still unspent on the blockchain', async () => {
      const ADDR_B = 'tb1qother';
      const validUtxo: Utxo = { txid: 'valid-tx', vout: 0, valueSats: 80_000, address: ADDR_B, isConfirmed: true };
      const local = [makeUtxo('tx1'), validUtxo];
      const repo = makeRepo(local);
      const provider = makeProvider([]);
      provider.getUtxos
        .mockResolvedValueOnce([makeUtxo('tx1')]) // ADDRESS: primary, still present
        .mockResolvedValueOnce([validUtxo]);       // ADDR_B: verified, still unspent
      const useCase = new SyncUtxosUseCase(repo, provider);
      await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);

      const [, savedUtxos]: [string, Utxo[]] = (repo.replaceAll as jest.Mock).mock.calls[0];
      expect(savedUtxos.some(u => u.txid === 'valid-tx')).toBe(true);
      expect(savedUtxos.some(u => u.txid === 'tx1')).toBe(true);
    });

    it('preserves frozen state for verified non-primary UTXOs', async () => {
      const ADDR_B = 'tb1qother';
      const frozenUtxo: Utxo = { txid: 'frozen-tx', vout: 0, valueSats: 30_000, address: ADDR_B, isConfirmed: true, isFrozen: true };
      const local = [frozenUtxo];
      const freshFromChain: Utxo = { txid: 'frozen-tx', vout: 0, valueSats: 30_000, address: ADDR_B, isConfirmed: true };
      const repo = makeRepo(local);
      const provider = makeProvider([]);
      provider.getUtxos
        .mockResolvedValueOnce([])           // ADDRESS (primary): no UTXOs
        .mockResolvedValueOnce([freshFromChain]); // ADDR_B (verify): UTXO still exists
      const useCase = new SyncUtxosUseCase(repo, provider);
      await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);

      const [, savedUtxos]: [string, Utxo[]] = (repo.replaceAll as jest.Mock).mock.calls[0];
      const saved = savedUtxos.find(u => u.txid === 'frozen-tx');
      expect(saved?.isFrozen).toBe(true);
    });

    it('handles multiple non-primary addresses with a mix of spent and unspent UTXOs', async () => {
      const ADDR_B = 'tb1qspent';
      const ADDR_C = 'tb1qunspent';
      const spentUtxo: Utxo = { txid: 'spent-tx', vout: 0, valueSats: 10_000, address: ADDR_B, isConfirmed: true };
      const liveUtxo: Utxo = { txid: 'live-tx', vout: 0, valueSats: 20_000, address: ADDR_C, isConfirmed: true };
      const local = [makeUtxo('tx1'), spentUtxo, liveUtxo];
      const repo = makeRepo(local);
      const provider = makeProvider([]);
      provider.getUtxos
        .mockResolvedValueOnce([makeUtxo('tx1')]) // ADDRESS (primary)
        .mockResolvedValueOnce([])                // ADDR_B: spent
        .mockResolvedValueOnce([liveUtxo]);       // ADDR_C: still live
      const useCase = new SyncUtxosUseCase(repo, provider);
      await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);

      const [, savedUtxos]: [string, Utxo[]] = (repo.replaceAll as jest.Mock).mock.calls[0];
      expect(savedUtxos.some(u => u.txid === 'spent-tx')).toBe(false);
      expect(savedUtxos.some(u => u.txid === 'live-tx')).toBe(true);
      expect(savedUtxos.some(u => u.txid === 'tx1')).toBe(true);
    });
  });

  describe('parallel mode', () => {
    it('fetches all addresses simultaneously when parallel is true', async () => {
      const ADDR_B = 'tb1qaddr2';
      const utxo0 = makeUtxo('tx1');
      const utxo1 = { ...makeUtxo('tx2'), address: ADDR_B };
      const repo = makeRepo([]);
      const provider = makeProvider([]);
      provider.getUtxos
        .mockResolvedValueOnce([utxo0])
        .mockResolvedValueOnce([utxo1]);
      const useCase = new SyncUtxosUseCase(repo, provider);
      const result = await useCase.execute(WALLET_ID, [ADDRESS, ADDR_B], NETWORK, undefined, { parallel: true });
      expect(result.newCount).toBe(2);
      expect(provider.getUtxos).toHaveBeenCalledTimes(2);
      expect(repo.replaceAll).toHaveBeenCalledTimes(1);
    });

    it('produces the same result in parallel as sequential mode', async () => {
      const ADDR_B = 'tb1qaddr2';
      const utxo0 = makeUtxo('tx1');
      const utxo1 = { ...makeUtxo('tx2'), address: ADDR_B };
      const provider = makeProvider([]);

      provider.getUtxos.mockResolvedValueOnce([utxo0]).mockResolvedValueOnce([utxo1]);
      const seqCase = new SyncUtxosUseCase(makeRepo([]), provider);
      const seqResult = await seqCase.execute(WALLET_ID, [ADDRESS, ADDR_B], NETWORK);

      provider.getUtxos.mockResolvedValueOnce([utxo0]).mockResolvedValueOnce([utxo1]);
      const parCase = new SyncUtxosUseCase(makeRepo([]), provider);
      const parResult = await parCase.execute(WALLET_ID, [ADDRESS, ADDR_B], NETWORK, undefined, { parallel: true });

      expect(parResult.newCount).toBe(seqResult.newCount);
      expect(parResult.spentCount).toBe(seqResult.spentCount);
    });

    it('overrides requestDelayMs via opts', async () => {
      const provider = makeProvider([makeUtxo('tx1')]);
      const useCase = new SyncUtxosUseCase(makeRepo([]), provider, 99999);
      // Should complete quickly because opts.requestDelayMs=0 overrides constructor delay
      const start = Date.now();
      await useCase.execute(WALLET_ID, [ADDRESS], NETWORK, undefined, { requestDelayMs: 0 });
      expect(Date.now() - start).toBeLessThan(500);
    });
  });
});
