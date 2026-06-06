import { FreezeUtxoUseCase } from '../../../src/core/domain/usecases/wallet/FreezeUtxoUseCase';
import { UnfreezeUtxoUseCase } from '../../../src/core/domain/usecases/wallet/UnfreezeUtxoUseCase';
import type { UtxoRepository } from '../../../src/core/domain/repositories/UtxoRepository';

const WALLET_ID = 'wallet-1';
const TXID = 'aabbccdd' + '00'.repeat(28);
const VOUT = 0;

function makeRepo(): jest.Mocked<UtxoRepository> {
  return {
    listByWallet: jest.fn(),
    replaceAll: jest.fn(),
    freeze: jest.fn().mockResolvedValue(undefined),
    unfreeze: jest.fn().mockResolvedValue(undefined),
  };
}

describe('FreezeUtxoUseCase', () => {
  describe('freezing a UTXO', () => {
    it('calls repository freeze with correct args', async () => {
      const repo = makeRepo();
      await new FreezeUtxoUseCase(repo).execute(WALLET_ID, TXID, VOUT);
      expect(repo.freeze).toHaveBeenCalledWith(WALLET_ID, TXID, VOUT);
    });

    it('calls repository freeze exactly once', async () => {
      const repo = makeRepo();
      await new FreezeUtxoUseCase(repo).execute(WALLET_ID, TXID, VOUT);
      expect(repo.freeze).toHaveBeenCalledTimes(1);
    });

    it('does not call unfreeze', async () => {
      const repo = makeRepo();
      await new FreezeUtxoUseCase(repo).execute(WALLET_ID, TXID, VOUT);
      expect(repo.unfreeze).not.toHaveBeenCalled();
    });

    it('propagates repository errors', async () => {
      const repo = makeRepo();
      repo.freeze.mockRejectedValue(new Error('DB error'));
      await expect(
        new FreezeUtxoUseCase(repo).execute(WALLET_ID, TXID, VOUT),
      ).rejects.toThrow('DB error');
    });
  });

  describe('freezing with vout disambiguation', () => {
    it('passes the correct vout to distinguish outputs from same txid', async () => {
      const repo = makeRepo();
      await new FreezeUtxoUseCase(repo).execute(WALLET_ID, TXID, 2);
      expect(repo.freeze).toHaveBeenCalledWith(WALLET_ID, TXID, 2);
    });
  });
});

describe('UnfreezeUtxoUseCase', () => {
  describe('unfreezing a UTXO', () => {
    it('calls repository unfreeze with correct args', async () => {
      const repo = makeRepo();
      await new UnfreezeUtxoUseCase(repo).execute(WALLET_ID, TXID, VOUT);
      expect(repo.unfreeze).toHaveBeenCalledWith(WALLET_ID, TXID, VOUT);
    });

    it('calls repository unfreeze exactly once', async () => {
      const repo = makeRepo();
      await new UnfreezeUtxoUseCase(repo).execute(WALLET_ID, TXID, VOUT);
      expect(repo.unfreeze).toHaveBeenCalledTimes(1);
    });

    it('does not call freeze', async () => {
      const repo = makeRepo();
      await new UnfreezeUtxoUseCase(repo).execute(WALLET_ID, TXID, VOUT);
      expect(repo.freeze).not.toHaveBeenCalled();
    });

    it('propagates repository errors', async () => {
      const repo = makeRepo();
      repo.unfreeze.mockRejectedValue(new Error('DB error'));
      await expect(
        new UnfreezeUtxoUseCase(repo).execute(WALLET_ID, TXID, VOUT),
      ).rejects.toThrow('DB error');
    });
  });

  describe('freeze then unfreeze cycle', () => {
    it('freeze then unfreeze calls both in order', async () => {
      const repo = makeRepo();
      const calls: string[] = [];
      repo.freeze.mockImplementation(async () => { calls.push('freeze'); });
      repo.unfreeze.mockImplementation(async () => { calls.push('unfreeze'); });

      await new FreezeUtxoUseCase(repo).execute(WALLET_ID, TXID, VOUT);
      await new UnfreezeUtxoUseCase(repo).execute(WALLET_ID, TXID, VOUT);

      expect(calls).toEqual(['freeze', 'unfreeze']);
    });
  });
});
