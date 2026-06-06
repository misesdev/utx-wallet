import { TransactionStorage } from '../../../src/core/infrastructure/storage/TransactionStorage';
import { createDatabaseMock } from '../../mocks/database';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';

const tx: Transaction = {
  id: 'tx-1',
  txid: 'deadbeef',
  amountSats: 10000,
  feeSats: 1800,
  direction: 'outgoing',
  status: 'pending',
  createdAt: '2026-06-05T00:00:00.000Z',
};

describe('TransactionStorage', () => {
  describe('listByWallet()', () => {
    it('maps database rows to Transaction objects', async () => {
      const db = createDatabaseMock();
      (db.execute as jest.Mock).mockResolvedValueOnce([
        {
          id: 'tx-1',
          txid: 'deadbeef',
          amount_sats: 10000,
          fee_sats: 1800,
          direction: 'outgoing',
          status: 'pending',
          created_at: '2026-06-05T00:00:00.000Z',
        },
      ]);
      const storage = new TransactionStorage(db);
      const result = await storage.listByWallet('wallet-1');
      expect(result).toEqual([tx]);
    });

    it('converts null txid to undefined', async () => {
      const db = createDatabaseMock();
      (db.execute as jest.Mock).mockResolvedValueOnce([
        { id: 'tx-2', txid: null, amount_sats: 5000, fee_sats: null, direction: 'incoming', status: 'confirmed', created_at: '2026-06-05T01:00:00.000Z' },
      ]);
      const storage = new TransactionStorage(db);
      const [result] = await storage.listByWallet('w1');
      expect(result.txid).toBeUndefined();
      expect(result.feeSats).toBeUndefined();
    });

    it('returns empty array when no rows', async () => {
      const db = createDatabaseMock();
      const storage = new TransactionStorage(db);
      await expect(storage.listByWallet('wallet-1')).resolves.toEqual([]);
    });

    it('queries by wallet_id', async () => {
      const db = createDatabaseMock();
      const storage = new TransactionStorage(db);
      await storage.listByWallet('wallet-99');
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('wallet_id = ?'),
        ['wallet-99'],
      );
    });
  });

  describe('save()', () => {
    it('uses INSERT OR REPLACE with correct params', async () => {
      const db = createDatabaseMock();
      const storage = new TransactionStorage(db);
      await storage.save('wallet-1', tx);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        expect.arrayContaining(['tx-1', 'wallet-1', 'deadbeef', 10000, 1800, 'outgoing', 'pending']),
      );
    });

    it('saves null for missing txid and feeSats', async () => {
      const db = createDatabaseMock();
      const storage = new TransactionStorage(db);
      const txWithoutOptionals: Partial<Transaction> = { ...tx };
      delete txWithoutOptionals.txid;
      delete txWithoutOptionals.feeSats;
      await storage.save('wallet-1', txWithoutOptionals as Transaction);
      const params = (db.execute as jest.Mock).mock.calls[0][1];
      expect(params[2]).toBeNull();
      expect(params[4]).toBeNull();
    });
  });
});
