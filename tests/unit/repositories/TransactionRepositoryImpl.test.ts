import { TransactionRepositoryImpl } from '../../../src/core/infrastructure/repositories/TransactionRepositoryImpl';
import { AppError } from '../../../src/core/application/errors/AppError';

describe('TransactionRepositoryImpl', () => {
  const repo = new TransactionRepositoryImpl();

  describe('build()', () => {
    it('computes feeSats as feeRate × estimated vbytes, not the raw rate', async () => {
      const tx = await repo.build({ toAddress: 'tb1q...', amountSats: 10000, feeRateSatsPerVByte: 10 });
      expect(tx.feeSats).toBe(1800); // 10 × 180
      expect(tx.feeSats).not.toBe(10); // was the bug: storing the rate as the fee
    });

    it('defaults to 1 sat/vbyte when feeRateSatsPerVByte is omitted', async () => {
      const tx = await repo.build({ toAddress: 'tb1q...', amountSats: 5000 });
      expect(tx.feeSats).toBe(180); // 1 × 180
    });

    it('uses ceiling to avoid fractional satoshis', async () => {
      const tx = await repo.build({ toAddress: 'tb1q...', amountSats: 1000, feeRateSatsPerVByte: 1.5 });
      expect(tx.feeSats).toBe(270); // ceil(1.5 × 180)
      expect(Number.isInteger(tx.feeSats)).toBe(true);
    });

    it('returns pending outgoing transaction with correct amount', async () => {
      const tx = await repo.build({ toAddress: 'tb1q...', amountSats: 50000, feeRateSatsPerVByte: 5 });
      expect(tx.amountSats).toBe(50000);
      expect(tx.status).toBe('pending');
      expect(tx.direction).toBe('outgoing');
    });

    it('generates unique IDs for concurrent builds', async () => {
      const [t1, t2] = await Promise.all([
        repo.build({ toAddress: 'a', amountSats: 1000 }),
        repo.build({ toAddress: 'b', amountSats: 2000 }),
      ]);
      expect(t1.id).toBeTruthy();
      expect(t1.id).not.toBe(t2.id);
    });
  });

  describe('sign()', () => {
    it('throws AppError with SIGNING_NOT_AVAILABLE code', async () => {
      const tx = await repo.build({ toAddress: 'tb1q...', amountSats: 1000 });
      await expect(repo.sign(tx)).rejects.toThrow(AppError);
      await expect(repo.sign(tx)).rejects.toMatchObject({ code: 'SIGNING_NOT_AVAILABLE' });
    });
  });

  describe('broadcast()', () => {
    it('throws AppError with BROADCAST_NOT_AVAILABLE code', async () => {
      const tx = await repo.build({ toAddress: 'tb1q...', amountSats: 1000 });
      await expect(repo.broadcast(tx)).rejects.toThrow(AppError);
      await expect(repo.broadcast(tx)).rejects.toMatchObject({ code: 'BROADCAST_NOT_AVAILABLE' });
    });
  });

  describe('list()', () => {
    it('returns empty array (history comes from network sync, not local stubs)', async () => {
      await expect(repo.list('wallet-1')).resolves.toEqual([]);
    });
  });
});
