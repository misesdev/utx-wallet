/**
 * Integration: Offline Mode Flow
 *
 * Tests: OfflineModeService → SaveOfflineTransactionUseCase + LoadOfflineTransactionsUseCase
 * + DeleteOfflineTransactionUseCase → OfflineTransactionRepositoryImpl → OfflineTransactionStorage
 * → InMemoryDatabase
 *
 * Also tests: importRawHex, broadcastTransaction (mocked BlockchainProvider)
 *
 * Real: all offline use cases, repository impl, storage
 * Mocked: BuildTransactionUseCase, SignTransactionUseCase, BlockchainProvider, InMemoryDatabase
 */
import { OfflineModeService } from '../../src/core/application/services/OfflineModeService';
import { SaveOfflineTransactionUseCase } from '../../src/core/domain/usecases/offline/SaveOfflineTransactionUseCase';
import { LoadOfflineTransactionsUseCase } from '../../src/core/domain/usecases/offline/LoadOfflineTransactionsUseCase';
import { DeleteOfflineTransactionUseCase } from '../../src/core/domain/usecases/offline/DeleteOfflineTransactionUseCase';
import { OfflineTransactionRepositoryImpl } from '../../src/core/infrastructure/repositories/OfflineTransactionRepositoryImpl';
import { OfflineTransactionStorage } from '../../src/core/infrastructure/storage/OfflineTransactionStorage';
import type { BuildTransactionUseCase } from '../../src/core/domain/usecases/transaction/BuildTransactionUseCase';
import type { SignTransactionUseCase } from '../../src/core/domain/usecases/transaction/SignTransactionUseCase';
import type { BlockchainProvider } from '../../src/core/domain/repositories/BlockchainProvider';
import { InMemoryDatabase } from './helpers/InMemoryDatabase';

const WALLET_ID = 'offline-wallet';
const VALID_HEX = '02000000000101' + 'ab'.repeat(35);

function makeBlockchainProvider(txid = 'broadcast-txid'): jest.Mocked<BlockchainProvider> {
  return {
    getBalance: jest.fn(),
    getUtxos: jest.fn(),
    getTransactions: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn().mockResolvedValue(txid),
  };
}

function makeSetup() {
  const db = new InMemoryDatabase();
  const storage = new OfflineTransactionStorage(db);
  const repository = new OfflineTransactionRepositoryImpl(storage);
  const saveUseCase = new SaveOfflineTransactionUseCase(repository);
  const loadUseCase = new LoadOfflineTransactionsUseCase(repository);
  const deleteUseCase = new DeleteOfflineTransactionUseCase(repository);

  const stubBuild = { execute: jest.fn() } as unknown as jest.Mocked<BuildTransactionUseCase>;
  const stubSign = { execute: jest.fn() } as unknown as jest.Mocked<SignTransactionUseCase>;

  return {
    makeService(provider?: jest.Mocked<BlockchainProvider>) {
      return new OfflineModeService(
        stubBuild,
        stubSign,
        saveUseCase,
        loadUseCase,
        deleteUseCase,
        provider ?? makeBlockchainProvider(),
      );
    },
    repository,
    db,
  };
}

describe('Integration: Offline Mode', () => {
  describe('importRawHex', () => {
    it('stores a transaction from a valid raw hex', async () => {
      const { makeService } = makeSetup();
      const service = makeService();
      const tx = await service.importRawHex(WALLET_ID, VALID_HEX);

      expect(tx.walletId).toBe(WALLET_ID);
      expect(tx.rawHex).toBe(VALID_HEX);
      expect(typeof tx.id).toBe('string');
      expect(tx.id.length).toBeGreaterThan(0);
    });

    it('stores metadata options when provided', async () => {
      const { makeService } = makeSetup();
      const service = makeService();
      const tx = await service.importRawHex(WALLET_ID, VALID_HEX, {
        toAddress: 'bc1qrecipient',
        amountSats: 50_000,
        feeSats: 900,
      });

      expect(tx.toAddress).toBe('bc1qrecipient');
      expect(tx.amountSats).toBe(50_000);
      expect(tx.feeSats).toBe(900);
    });

    it('throws INVALID_HEX for empty string', async () => {
      const { makeService } = makeSetup();
      const service = makeService();
      await expect(service.importRawHex(WALLET_ID, '')).rejects.toMatchObject({
        code: 'INVALID_HEX',
      });
    });

    it('throws INVALID_HEX for non-hex string', async () => {
      const { makeService } = makeSetup();
      const service = makeService();
      await expect(service.importRawHex(WALLET_ID, 'not-hex-data!')).rejects.toMatchObject({
        code: 'INVALID_HEX',
      });
    });

    it('trims whitespace before validating the hex', async () => {
      const { makeService } = makeSetup();
      const service = makeService();
      const tx = await service.importRawHex(WALLET_ID, `  ${VALID_HEX}  `);
      expect(tx.rawHex).toBe(VALID_HEX);
    });
  });

  describe('listTransactions', () => {
    it('returns empty list when no transactions are stored', async () => {
      const { makeService } = makeSetup();
      const service = makeService();
      const txs = await service.listTransactions(WALLET_ID);
      expect(txs).toHaveLength(0);
    });

    it('returns all stored transactions for the wallet', async () => {
      const { makeService } = makeSetup();
      const service = makeService();
      await service.importRawHex(WALLET_ID, VALID_HEX);
      await service.importRawHex(WALLET_ID, VALID_HEX.replace('02', '01'));

      const txs = await service.listTransactions(WALLET_ID);
      expect(txs).toHaveLength(2);
    });

    it('only returns transactions for the requested wallet', async () => {
      const { makeService } = makeSetup();
      const service = makeService();
      await service.importRawHex('wallet-A', VALID_HEX);
      await service.importRawHex('wallet-B', VALID_HEX.replace('02', '01'));

      const txsA = await service.listTransactions('wallet-A');
      expect(txsA).toHaveLength(1);
      expect(txsA[0].walletId).toBe('wallet-A');
    });
  });

  describe('deleteTransaction', () => {
    it('removes the transaction from storage', async () => {
      const { makeService } = makeSetup();
      const service = makeService();
      const tx = await service.importRawHex(WALLET_ID, VALID_HEX);

      await service.deleteTransaction(tx.id);

      const txs = await service.listTransactions(WALLET_ID);
      expect(txs).toHaveLength(0);
    });

    it('does not affect other transactions', async () => {
      const { makeService } = makeSetup();
      const service = makeService();
      const tx1 = await service.importRawHex(WALLET_ID, VALID_HEX);
      await service.importRawHex(WALLET_ID, VALID_HEX.replace('02', '01'));

      await service.deleteTransaction(tx1.id);

      const txs = await service.listTransactions(WALLET_ID);
      expect(txs).toHaveLength(1);
    });
  });

  describe('broadcastTransaction', () => {
    it('calls blockchain provider with the stored rawHex', async () => {
      const provider = makeBlockchainProvider();
      const { makeService } = makeSetup();
      const service = makeService(provider);
      const stored = await service.importRawHex(WALLET_ID, VALID_HEX);

      await service.broadcastTransaction(stored);

      expect(provider.broadcastTransaction).toHaveBeenCalledWith(VALID_HEX);
    });

    it('returns the txid from the blockchain provider', async () => {
      const provider = makeBlockchainProvider('real-txid-here');
      const { makeService } = makeSetup();
      const service = makeService(provider);
      const stored = await service.importRawHex(WALLET_ID, VALID_HEX);

      const txid = await service.broadcastTransaction(stored);
      expect(txid).toBe('real-txid-here');
    });

    it('deletes the offline transaction after successful broadcast', async () => {
      const provider = makeBlockchainProvider();
      const { makeService } = makeSetup();
      const service = makeService(provider);
      const stored = await service.importRawHex(WALLET_ID, VALID_HEX);

      await service.broadcastTransaction(stored);

      const remaining = await service.listTransactions(WALLET_ID);
      expect(remaining).toHaveLength(0);
    });

    it('does not delete transaction if broadcast fails', async () => {
      const provider = makeBlockchainProvider();
      provider.broadcastTransaction.mockRejectedValue(new Error('Network down'));
      const { makeService } = makeSetup();
      const service = makeService(provider);
      const stored = await service.importRawHex(WALLET_ID, VALID_HEX);

      await expect(service.broadcastTransaction(stored)).rejects.toThrow('Network down');

      const remaining = await service.listTransactions(WALLET_ID);
      expect(remaining).toHaveLength(1);
    });
  });
});
