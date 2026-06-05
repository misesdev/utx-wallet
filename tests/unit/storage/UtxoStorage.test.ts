import { UtxoStorage } from '../../../src/core/infrastructure/storage/UtxoStorage';
import { createDatabaseMock } from '../../mocks/database';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';

const utxo: Utxo = {
  txid: 'abc123',
  vout: 0,
  valueSats: 1000,
  address: 'tb1qplaceholder',
  isConfirmed: true,
};

describe('UtxoStorage', () => {
  describe('load()', () => {
    it('maps database snake_case rows to Utxo camelCase', async () => {
      const db = createDatabaseMock();
      (db.execute as jest.Mock).mockResolvedValueOnce([
        { txid: 'abc123', vout: 0, value_sats: 1000, address: 'tb1qplaceholder', is_confirmed: 1 },
      ]);
      const storage = new UtxoStorage(db);
      const result = await storage.load('wallet-1');
      expect(result).toEqual([utxo]);
    });

    it('filters by wallet_id via SQL parameter', async () => {
      const db = createDatabaseMock();
      const storage = new UtxoStorage(db);
      await storage.load('wallet-99');
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('wallet_id = ?'),
        ['wallet-99'],
      );
    });

    it('returns empty array when no rows match', async () => {
      const db = createDatabaseMock();
      const storage = new UtxoStorage(db);
      await expect(storage.load('wallet-1')).resolves.toEqual([]);
    });

    it('maps is_confirmed=0 to isConfirmed=false', async () => {
      const db = createDatabaseMock();
      (db.execute as jest.Mock).mockResolvedValueOnce([
        { txid: 'def456', vout: 1, value_sats: 500, address: 'tb1q...', is_confirmed: 0 },
      ]);
      const storage = new UtxoStorage(db);
      const [result] = await storage.load('w1');
      expect(result.isConfirmed).toBe(false);
    });
  });

  describe('save()', () => {
    it('deletes existing UTXOs for wallet before inserting', async () => {
      const db = createDatabaseMock();
      const storage = new UtxoStorage(db);
      await storage.save('wallet-1', [utxo]);
      expect(db.execute).toHaveBeenNthCalledWith(1, expect.stringContaining('DELETE'), ['wallet-1']);
    });

    it('inserts each UTXO with correct column values', async () => {
      const db = createDatabaseMock();
      const storage = new UtxoStorage(db);
      await storage.save('wallet-1', [utxo]);
      expect(db.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO utxos'),
        ['abc123', 0, 1000, 'tb1qplaceholder', 1, 'wallet-1'],
      );
    });

    it('maps isConfirmed=false to 0 in database', async () => {
      const db = createDatabaseMock();
      const storage = new UtxoStorage(db);
      await storage.save('w1', [{ ...utxo, isConfirmed: false }]);
      const insertParams = (db.execute as jest.Mock).mock.calls[1][1];
      expect(insertParams[4]).toBe(0);
    });

    it('saves nothing (only DELETE) when utxo list is empty', async () => {
      const db = createDatabaseMock();
      const storage = new UtxoStorage(db);
      await storage.save('wallet-1', []);
      expect(db.execute).toHaveBeenCalledTimes(1);
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('DELETE'), ['wallet-1']);
    });
  });
});
