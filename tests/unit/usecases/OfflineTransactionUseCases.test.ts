import { SaveOfflineTransactionUseCase } from '../../../src/core/domain/usecases/offline/SaveOfflineTransactionUseCase';
import { LoadOfflineTransactionsUseCase } from '../../../src/core/domain/usecases/offline/LoadOfflineTransactionsUseCase';
import { DeleteOfflineTransactionUseCase } from '../../../src/core/domain/usecases/offline/DeleteOfflineTransactionUseCase';
import type { OfflineTransactionRepository } from '../../../src/core/domain/repositories/OfflineTransactionRepository';
import type { OfflineTransaction } from '../../../src/core/domain/entities/OfflineTransaction';

const WALLET_ID = 'wallet-1';

function makeTx(id = 'tx-1'): OfflineTransaction {
  return {
    id,
    walletId: WALLET_ID,
    rawHex: 'deadbeef',
    txid: 'abcd',
    amountSats: 100_000,
    feeSats: 500,
    toAddress: 'tb1qtest',
    createdAt: '2026-06-06T00:00:00.000Z',
  };
}

function makeRepo(txs: OfflineTransaction[] = []): jest.Mocked<OfflineTransactionRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue(txs),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

describe('SaveOfflineTransactionUseCase', () => {
  describe('salvar transação pendente (save pending transaction)', () => {
    it('delegates to repository save', async () => {
      const repo = makeRepo();
      const tx = makeTx();
      await new SaveOfflineTransactionUseCase(repo).execute(tx);
      expect(repo.save).toHaveBeenCalledWith(tx);
    });

    it('calls save exactly once', async () => {
      const repo = makeRepo();
      await new SaveOfflineTransactionUseCase(repo).execute(makeTx());
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('propagates repository errors', async () => {
      const repo = makeRepo();
      repo.save.mockRejectedValue(new Error('DB full'));
      await expect(new SaveOfflineTransactionUseCase(repo).execute(makeTx())).rejects.toThrow('DB full');
    });

    it('preserves all fields of the offline transaction', async () => {
      const repo = makeRepo();
      const tx = makeTx('saved-id');
      await new SaveOfflineTransactionUseCase(repo).execute(tx);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
        id: 'saved-id',
        rawHex: 'deadbeef',
        amountSats: 100_000,
      }));
    });
  });
});

describe('LoadOfflineTransactionsUseCase', () => {
  describe('dados locais disponíveis (local data available)', () => {
    it('returns all transactions for the wallet', async () => {
      const txs = [makeTx('tx-1'), makeTx('tx-2')];
      const repo = makeRepo(txs);
      const result = await new LoadOfflineTransactionsUseCase(repo).execute(WALLET_ID);
      expect(result).toHaveLength(2);
    });

    it('passes walletId to repository', async () => {
      const repo = makeRepo([makeTx()]);
      await new LoadOfflineTransactionsUseCase(repo).execute(WALLET_ID);
      expect(repo.list).toHaveBeenCalledWith(WALLET_ID);
    });
  });

  describe('dados locais indisponíveis (no local data)', () => {
    it('returns empty array when repository has no transactions', async () => {
      const repo = makeRepo([]);
      const result = await new LoadOfflineTransactionsUseCase(repo).execute(WALLET_ID);
      expect(result).toHaveLength(0);
    });

    it('propagates repository error', async () => {
      const repo = makeRepo();
      repo.list.mockRejectedValue(new Error('DB not initialized'));
      await expect(new LoadOfflineTransactionsUseCase(repo).execute(WALLET_ID)).rejects.toThrow();
    });
  });
});

describe('DeleteOfflineTransactionUseCase', () => {
  it('delegates to repository delete with the id', async () => {
    const repo = makeRepo();
    await new DeleteOfflineTransactionUseCase(repo).execute('tx-1');
    expect(repo.delete).toHaveBeenCalledWith('tx-1');
  });

  it('calls delete exactly once', async () => {
    const repo = makeRepo();
    await new DeleteOfflineTransactionUseCase(repo).execute('tx-1');
    expect(repo.delete).toHaveBeenCalledTimes(1);
  });

  it('propagates repository error', async () => {
    const repo = makeRepo();
    repo.delete.mockRejectedValue(new Error('not found'));
    await expect(new DeleteOfflineTransactionUseCase(repo).execute('tx-1')).rejects.toThrow();
  });
});
