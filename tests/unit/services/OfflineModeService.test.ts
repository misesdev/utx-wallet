import { OfflineModeService } from '../../../src/core/application/services/OfflineModeService';
import { SaveOfflineTransactionUseCase } from '../../../src/core/domain/usecases/offline/SaveOfflineTransactionUseCase';
import { LoadOfflineTransactionsUseCase } from '../../../src/core/domain/usecases/offline/LoadOfflineTransactionsUseCase';
import { DeleteOfflineTransactionUseCase } from '../../../src/core/domain/usecases/offline/DeleteOfflineTransactionUseCase';
import { BuildTransactionUseCase } from '../../../src/core/domain/usecases/transaction/BuildTransactionUseCase';
import { SignTransactionUseCase } from '../../../src/core/domain/usecases/transaction/SignTransactionUseCase';
import type { BlockchainProvider } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { OfflineTransaction } from '../../../src/core/domain/entities/OfflineTransaction';
import type { BuiltTransaction } from '../../../src/core/domain/entities/BuiltTransaction';
import type { SignedTransaction } from '../../../src/core/domain/entities/SignedTransaction';
import type { OfflineTransactionRepository } from '../../../src/core/domain/repositories/OfflineTransactionRepository';
import { AppError } from '../../../src/core/application/errors/AppError';

const WALLET_ID = 'wallet-1';
const RAW_HEX = 'deadbeef01020304';
const TXID = 'aabbccdd' + '00'.repeat(28);

const BUILT: BuiltTransaction = {
  id: 'built-1',
  walletId: WALLET_ID,
  inputs: [],
  outputs: [{ address: 'tb1qtest', amountSats: 100_000, isChange: false }],
  amountSats: 100_000,
  feeSats: 900,
  totalSats: 100_900,
  changeSats: 0,
  feeRateSatsPerVByte: 5,
  estimatedVBytes: 180,
  status: 'built',
  createdAt: '2026-06-06T00:00:00.000Z',
};

const SIGNED: SignedTransaction = {
  rawHex: RAW_HEX,
  txid: TXID,
  builtTransaction: BUILT,
};

function makeRepo(txs: OfflineTransaction[] = []): jest.Mocked<OfflineTransactionRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue(txs),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function makeBuildUseCase(result = BUILT): jest.Mocked<BuildTransactionUseCase> {
  return { execute: jest.fn().mockResolvedValue(result) } as unknown as jest.Mocked<BuildTransactionUseCase>;
}

function makeSignUseCase(result = SIGNED): jest.Mocked<SignTransactionUseCase> {
  return { execute: jest.fn().mockResolvedValue(result) } as unknown as jest.Mocked<SignTransactionUseCase>;
}

function makeBlockchainProvider(txid = TXID): jest.Mocked<BlockchainProvider> {
  return {
    getBalance: jest.fn(),
    getUtxos: jest.fn(),
    getTransactions: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn().mockResolvedValue(txid),
    getRawTransaction: jest.fn(),
  };
}

function makeService(overrides: {
  repo?: jest.Mocked<OfflineTransactionRepository>;
  build?: jest.Mocked<BuildTransactionUseCase>;
  sign?: jest.Mocked<SignTransactionUseCase>;
  provider?: jest.Mocked<BlockchainProvider>;
} = {}) {
  const repo = overrides.repo ?? makeRepo();
  return {
    service: new OfflineModeService(
      overrides.build ?? makeBuildUseCase(),
      overrides.sign ?? makeSignUseCase(),
      new SaveOfflineTransactionUseCase(repo),
      new LoadOfflineTransactionsUseCase(repo),
      new DeleteOfflineTransactionUseCase(repo),
      overrides.provider ?? makeBlockchainProvider(),
    ),
    repo,
  };
}

const BASE_PARAMS = {
  walletId: WALLET_ID,
  walletNetwork: 'testnet4' as const,
  toAddress: 'tb1qtest',
  amountSats: 100_000,
  feeRateSatsPerVByte: 5,
};

describe('OfflineModeService', () => {
  describe('criar transação offline (prepareTransaction)', () => {
    it('calls build then sign in order', async () => {
      const calls: string[] = [];
      const build = makeBuildUseCase();
      const sign = makeSignUseCase();
      build.execute.mockImplementation(async () => { calls.push('build'); return BUILT; });
      sign.execute.mockImplementation(async () => { calls.push('sign'); return SIGNED; });
      const { service } = makeService({ build, sign });
      await service.prepareTransaction(BASE_PARAMS);
      expect(calls).toEqual(['build', 'sign']);
    });

    it('saves the offline transaction to repository', async () => {
      const repo = makeRepo();
      const { service } = makeService({ repo });
      await service.prepareTransaction(BASE_PARAMS);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('returns an OfflineTransaction with rawHex from signer', async () => {
      const { service } = makeService();
      const result = await service.prepareTransaction(BASE_PARAMS);
      expect(result.rawHex).toBe(RAW_HEX);
      expect(result.txid).toBe(TXID);
    });

    it('includes amount and fee from the built transaction', async () => {
      const { service } = makeService();
      const result = await service.prepareTransaction(BASE_PARAMS);
      expect(result.amountSats).toBe(BUILT.amountSats);
      expect(result.feeSats).toBe(BUILT.feeSats);
    });

    it('includes toAddress and walletId', async () => {
      const { service } = makeService();
      const result = await service.prepareTransaction(BASE_PARAMS);
      expect(result.toAddress).toBe(BASE_PARAMS.toAddress);
      expect(result.walletId).toBe(WALLET_ID);
    });

    it('propagates build error without saving', async () => {
      const build = makeBuildUseCase();
      const repo = makeRepo();
      build.execute.mockRejectedValue(new AppError('Saldo insuficiente', 'INSUFFICIENT_BALANCE'));
      const { service } = makeService({ build, repo });
      await expect(service.prepareTransaction(BASE_PARAMS)).rejects.toMatchObject({
        code: 'INSUFFICIENT_BALANCE',
      });
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('sem internet — importar hex (import raw hex)', () => {
    it('saves a valid hex string as an offline transaction', async () => {
      const repo = makeRepo();
      const { service } = makeService({ repo });
      await service.importRawHex(WALLET_ID, RAW_HEX);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('returns an OfflineTransaction with the provided rawHex', async () => {
      const { service } = makeService();
      const result = await service.importRawHex(WALLET_ID, RAW_HEX);
      expect(result.rawHex).toBe(RAW_HEX);
      expect(result.walletId).toBe(WALLET_ID);
    });

    it('trims whitespace from raw hex', async () => {
      const { service } = makeService();
      const result = await service.importRawHex(WALLET_ID, `  ${RAW_HEX}  `);
      expect(result.rawHex).toBe(RAW_HEX);
    });

    it('includes optional metadata when provided', async () => {
      const { service } = makeService();
      const result = await service.importRawHex(WALLET_ID, RAW_HEX, {
        toAddress: 'tb1qtest',
        amountSats: 50_000,
        feeSats: 300,
      });
      expect(result.toAddress).toBe('tb1qtest');
      expect(result.amountSats).toBe(50_000);
      expect(result.feeSats).toBe(300);
    });

    it('rejects non-hex strings with INVALID_HEX', async () => {
      const { service } = makeService();
      await expect(
        service.importRawHex(WALLET_ID, 'not-valid-hex!'),
      ).rejects.toMatchObject({ code: 'INVALID_HEX' });
    });

    it('rejects empty string with INVALID_HEX', async () => {
      const { service } = makeService();
      await expect(service.importRawHex(WALLET_ID, '')).rejects.toMatchObject({ code: 'INVALID_HEX' });
    });

    it('does not call build or sign when importing', async () => {
      const build = makeBuildUseCase();
      const sign = makeSignUseCase();
      const { service } = makeService({ build, sign });
      await service.importRawHex(WALLET_ID, RAW_HEX);
      expect(build.execute).not.toHaveBeenCalled();
      expect(sign.execute).not.toHaveBeenCalled();
    });
  });

  describe('dados locais — listar transações offline (list)', () => {
    it('returns offline transactions from repository', async () => {
      const stored: OfflineTransaction[] = [
        { id: 'tx-1', walletId: WALLET_ID, rawHex: RAW_HEX, createdAt: '2026-06-06T00:00:00.000Z' },
      ];
      const repo = makeRepo(stored);
      const { service } = makeService({ repo });
      const result = await service.listTransactions(WALLET_ID);
      expect(result).toHaveLength(1);
    });

    it('returns empty list when no offline transactions saved', async () => {
      const { service } = makeService();
      const result = await service.listTransactions(WALLET_ID);
      expect(result).toHaveLength(0);
    });
  });

  describe('remover transação offline (delete)', () => {
    it('calls repository delete with correct id', async () => {
      const repo = makeRepo();
      const { service } = makeService({ repo });
      await service.deleteTransaction('tx-abc');
      expect(repo.delete).toHaveBeenCalledWith('tx-abc');
    });
  });

  describe('transmitir offline tx (broadcast)', () => {
    it('calls blockchainProvider.broadcastTransaction with rawHex', async () => {
      const provider = makeBlockchainProvider();
      const { service } = makeService({ provider });
      const tx: OfflineTransaction = { id: 'tx-1', walletId: WALLET_ID, rawHex: RAW_HEX, createdAt: '2026-06-06T00:00:00.000Z' };
      await service.broadcastTransaction(tx);
      expect(provider.broadcastTransaction).toHaveBeenCalledWith(RAW_HEX);
    });

    it('deletes the offline transaction after successful broadcast', async () => {
      const repo = makeRepo();
      const { service } = makeService({ repo });
      const tx: OfflineTransaction = { id: 'tx-1', walletId: WALLET_ID, rawHex: RAW_HEX, createdAt: '2026-06-06T00:00:00.000Z' };
      await service.broadcastTransaction(tx);
      expect(repo.delete).toHaveBeenCalledWith('tx-1');
    });

    it('returns the txid from the provider', async () => {
      const provider = makeBlockchainProvider('broadcast-txid-123');
      const { service } = makeService({ provider });
      const tx: OfflineTransaction = { id: 'tx-1', walletId: WALLET_ID, rawHex: RAW_HEX, createdAt: '2026-06-06T00:00:00.000Z' };
      const result = await service.broadcastTransaction(tx);
      expect(result).toBe('broadcast-txid-123');
    });

    it('does not delete the offline tx when broadcast fails', async () => {
      const provider = makeBlockchainProvider();
      const repo = makeRepo();
      provider.broadcastTransaction.mockRejectedValue(new AppError('Sem internet', 'HTTP_ERROR'));
      const { service } = makeService({ provider, repo });
      const tx: OfflineTransaction = { id: 'tx-1', walletId: WALLET_ID, rawHex: RAW_HEX, createdAt: '2026-06-06T00:00:00.000Z' };
      await expect(service.broadcastTransaction(tx)).rejects.toBeDefined();
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
