import { TransactionStorage } from '../../../src/core/infrastructure/storage/TransactionStorage';
import { createDatabaseMock } from '../../mocks/database';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';

// id reflects what mapRow returns: txid takes precedence over the DB row id
const tx: Transaction = {
  id: 'deadbeef',
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
          id: 'wallet-1:deadbeef',
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

    it('returns txid as the domain id when txid is present', async () => {
      const db = createDatabaseMock();
      (db.execute as jest.Mock).mockResolvedValueOnce([
        { id: 'wallet-1:abc', txid: 'abc', amount_sats: 5000, fee_sats: null, direction: 'incoming', status: 'confirmed', created_at: '2026-06-05T01:00:00.000Z' },
      ]);
      const storage = new TransactionStorage(db);
      const [result] = await storage.listByWallet('w1');
      expect(result.id).toBe('abc');
    });

    it('falls back to DB row id when txid is null (draft transactions)', async () => {
      const db = createDatabaseMock();
      (db.execute as jest.Mock).mockResolvedValueOnce([
        { id: 'wallet-1:uuid-draft', txid: null, amount_sats: 5000, fee_sats: null, direction: 'outgoing', status: 'pending', created_at: '2026-06-05T01:00:00.000Z' },
      ]);
      const storage = new TransactionStorage(db);
      const [result] = await storage.listByWallet('w1');
      expect(result.txid).toBeUndefined();
      expect(result.id).toBe('wallet-1:uuid-draft');
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
    it('uses INSERT OR REPLACE with wallet-scoped id', async () => {
      const db = createDatabaseMock();
      const storage = new TransactionStorage(db);
      await storage.save('wallet-1', tx);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        // Row id is wallet-scoped: walletId:txid
        expect.arrayContaining(['wallet-1:deadbeef', 'wallet-1', 'deadbeef', 10000, 1800, 'outgoing', 'pending']),
      );
    });

    it('uses walletId:id as row id when txid is absent', async () => {
      const db = createDatabaseMock();
      const storage = new TransactionStorage(db);
      const draft: Transaction = { id: 'draft-uuid', amountSats: 5000, direction: 'outgoing', status: 'pending', createdAt: '2026-06-05T00:00:00.000Z' };
      await storage.save('wallet-1', draft);
      const params = (db.execute as jest.Mock).mock.calls[0][1] as unknown[];
      // Row id: wallet-1:draft-uuid
      expect(params[0]).toBe('wallet-1:draft-uuid');
      expect(params[2]).toBeNull(); // txid is null
    });

    it('saves null for missing feeSats', async () => {
      const db = createDatabaseMock();
      const storage = new TransactionStorage(db);
      const txWithoutFee: Transaction = { ...tx, feeSats: undefined };
      await storage.save('wallet-1', txWithoutFee);
      const params = (db.execute as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[4]).toBeNull(); // feeSats
    });
  });
});
