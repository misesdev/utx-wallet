import { SyncTransactionsUseCase } from '../../../src/core/domain/usecases/wallet/SyncTransactionsUseCase';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { TransactionRepository } from '../../../src/core/domain/repositories/TransactionRepository';
import type { BlockchainProvider } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';

const WALLET_ID = 'wallet-1';
const ADDRESS = 'tb1qtest';
const NETWORK = 'testnet4' as const;

function makeTx(txid: string, id = txid): Transaction {
  return {
    id,
    txid,
    amountSats: 100_000,
    direction: 'incoming',
    status: 'confirmed',
    createdAt: '2026-06-05T00:00:00.000Z',
  };
}

function makeRepo(localTxs: Transaction[] = []): jest.Mocked<TransactionRepository> {
  return {
    build: jest.fn(),
    sign: jest.fn(),
    broadcast: jest.fn(),
    list: jest.fn().mockResolvedValue(localTxs),
    upsertAll: jest.fn().mockResolvedValue(undefined),
  };
}

function makeProvider(freshTxs: Transaction[] = []): jest.Mocked<BlockchainProvider> {
  return {
    getTransactions: jest.fn().mockResolvedValue(freshTxs),
    getBalance: jest.fn(),
    getUtxos: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
  };
}

describe('SyncTransactionsUseCase', () => {
  describe('new transactions', () => {
    it('detects transactions not yet in local cache', async () => {
      const fresh = [makeTx('tx1'), makeTx('tx2')];
      const useCase = new SyncTransactionsUseCase(makeRepo([]), makeProvider(fresh));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.newCount).toBe(2);
    });

    it('counts only transactions absent from local cache', async () => {
      const local = [makeTx('tx1')];
      const fresh = [makeTx('tx1'), makeTx('tx2')];
      const useCase = new SyncTransactionsUseCase(makeRepo(local), makeProvider(fresh));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.newCount).toBe(1);
    });

    it('upserts all fresh transactions into local storage', async () => {
      const fresh = [makeTx('tx1'), makeTx('tx2')];
      const repo = makeRepo([]);
      const useCase = new SyncTransactionsUseCase(repo, makeProvider(fresh));
      await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(repo.upsertAll).toHaveBeenCalledWith(WALLET_ID, fresh);
    });
  });

  describe('no new transactions', () => {
    it('returns zero new count when local and fresh are identical', async () => {
      const txs = [makeTx('tx1')];
      const useCase = new SyncTransactionsUseCase(makeRepo(txs), makeProvider(txs));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.newCount).toBe(0);
    });

    it('still calls upsertAll to refresh status of existing transactions', async () => {
      const txs = [makeTx('tx1')];
      const repo = makeRepo(txs);
      const useCase = new SyncTransactionsUseCase(repo, makeProvider(txs));
      await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(repo.upsertAll).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('returns zero when no transactions in blockchain or local', async () => {
      const useCase = new SyncTransactionsUseCase(makeRepo([]), makeProvider([]));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.newCount).toBe(0);
    });
  });

  describe('error handling', () => {
    it('throws and does not call upsertAll when provider is unavailable', async () => {
      const repo = makeRepo([]);
      const provider = makeProvider([]);
      provider.getTransactions.mockRejectedValue(
        new AppError('HTTP 503: Service Unavailable', 'HTTP_ERROR'),
      );
      const useCase = new SyncTransactionsUseCase(repo, provider);
      await expect(useCase.execute(WALLET_ID, [ADDRESS], NETWORK)).rejects.toMatchObject({ code: 'HTTP_ERROR' });
      expect(repo.upsertAll).not.toHaveBeenCalled();
    });

    it('propagates timeout error', async () => {
      const repo = makeRepo([]);
      const provider = makeProvider([]);
      provider.getTransactions.mockRejectedValue(new AppError('Request timed out', 'TIMEOUT'));
      const useCase = new SyncTransactionsUseCase(repo, provider);
      await expect(useCase.execute(WALLET_ID, [ADDRESS], NETWORK)).rejects.toMatchObject({ code: 'TIMEOUT' });
    });
  });

  describe('txid-based deduplication', () => {
    it('matches by txid even when local id differs', async () => {
      const local = [{ ...makeTx('abc123'), id: 'generated-local-id' }];
      const fresh = [makeTx('abc123')];
      const useCase = new SyncTransactionsUseCase(makeRepo(local), makeProvider(fresh));
      const result = await useCase.execute(WALLET_ID, [ADDRESS], NETWORK);
      expect(result.newCount).toBe(0);
    });
  });

  describe('multiple addresses', () => {
    it('deduplicates a tx that appears in both address results', async () => {
      const ADDR_B = 'tb1qaddr2';
      const sharedTx = makeTx('shared-txid');
      const repo = makeRepo([]);
      const provider = makeProvider([]);
      provider.getTransactions
        .mockResolvedValueOnce([sharedTx])  // ADDRESS
        .mockResolvedValueOnce([sharedTx]); // ADDR_B — same tx (send-to-self or coinbase)
      const useCase = new SyncTransactionsUseCase(repo, provider);
      const result = await useCase.execute(WALLET_ID, [ADDRESS, ADDR_B], NETWORK);
      expect(result.newCount).toBe(1); // counted once
      expect(repo.upsertAll).toHaveBeenCalledWith(WALLET_ID, [sharedTx]);
    });

    it('aggregates distinct transactions from multiple addresses', async () => {
      const ADDR_B = 'tb1qaddr2';
      const tx1 = makeTx('tx1');
      const tx2 = makeTx('tx2');
      const repo = makeRepo([]);
      const provider = makeProvider([]);
      provider.getTransactions
        .mockResolvedValueOnce([tx1])
        .mockResolvedValueOnce([tx2]);
      const useCase = new SyncTransactionsUseCase(repo, provider);
      const result = await useCase.execute(WALLET_ID, [ADDRESS, ADDR_B], NETWORK);
      expect(result.newCount).toBe(2);
      expect(repo.upsertAll).toHaveBeenCalledWith(WALLET_ID, [tx1, tx2]);
    });

    it('computes net sent amount when spending address and change address both return the same tx', async () => {
      // Scenario: wallet has 20k sats on address A, sends 5k to external, 14.1k change to address B.
      // MempoolApiAdapter computes per-address: A → outgoing 20k, B → incoming 14.1k.
      // After merge: net outgoing = 20k − 14.1k = 5.9k (sent + fee).
      const ADDR_B = 'tb1qchange';
      const TXID = 'send-with-change-txid';
      const txFromSpending: Transaction = {
        id: TXID,
        txid: TXID,
        amountSats: 20_000,
        feeSats: 900,
        direction: 'outgoing',
        status: 'pending',
        createdAt: '2026-06-07T00:00:00.000Z',
      };
      const txFromChange: Transaction = {
        id: TXID,
        txid: TXID,
        amountSats: 14_100,
        direction: 'incoming',
        status: 'pending',
        createdAt: '2026-06-07T00:00:00.000Z',
      };
      const repo = makeRepo([]);
      const provider = makeProvider([]);
      provider.getTransactions
        .mockResolvedValueOnce([txFromSpending]) // ADDRESS (spending address)
        .mockResolvedValueOnce([txFromChange]);  // ADDR_B (change address)
      const useCase = new SyncTransactionsUseCase(repo, provider);
      const result = await useCase.execute(WALLET_ID, [ADDRESS, ADDR_B], NETWORK);

      expect(result.newCount).toBe(1);
      const [saved] = (repo.upsertAll as jest.Mock).mock.calls[0][1] as Transaction[];
      expect(saved.direction).toBe('outgoing');
      expect(saved.amountSats).toBe(5_900); // 20k − 14.1k = net sent
    });

    it('clamps net amount to zero when change exceeds spend (e.g. dust)', async () => {
      const ADDR_B = 'tb1qchange2';
      const TXID = 'edge-case-txid';
      const txOut: Transaction = { id: TXID, txid: TXID, amountSats: 1_000, direction: 'outgoing', status: 'confirmed', createdAt: '2026-06-07T00:00:00.000Z' };
      const txIn: Transaction = { id: TXID, txid: TXID, amountSats: 2_000, direction: 'incoming', status: 'confirmed', createdAt: '2026-06-07T00:00:00.000Z' };
      const repo = makeRepo([]);
      const provider = makeProvider([]);
      provider.getTransactions
        .mockResolvedValueOnce([txOut])
        .mockResolvedValueOnce([txIn]);
      const useCase = new SyncTransactionsUseCase(repo, provider);
      await useCase.execute(WALLET_ID, [ADDRESS, ADDR_B], NETWORK);
      const [saved] = (repo.upsertAll as jest.Mock).mock.calls[0][1] as Transaction[];
      expect(saved.amountSats).toBe(0);
    });
  });
});
