import { BroadcastTransactionUseCase } from '../../../src/core/domain/usecases/transaction/BroadcastTransactionUseCase';
import type { BlockchainProvider } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { TransactionRepository } from '../../../src/core/domain/repositories/TransactionRepository';
import type { UtxoRepository } from '../../../src/core/domain/repositories/UtxoRepository';
import type { SignedTransaction } from '../../../src/core/domain/entities/SignedTransaction';
import type { BuiltTransaction } from '../../../src/core/domain/entities/BuiltTransaction';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';
import { AppError } from '../../../src/core/application/errors/AppError';

const WALLET_ID = 'wallet-1';
const TXID = 'aabbccdd' + '00'.repeat(28);

const BUILT: BuiltTransaction = {
  id: 'built-1',
  walletId: WALLET_ID,
  inputs: [
    {
      txid: 'spent-txid-1' + '0'.repeat(20),
      vout: 0,
      valueSats: 500_000,
      address: 'tb1qaddress',
      scriptPubKey: '00140000000000000000000000000000000000000000',
    },
    {
      txid: 'spent-txid-2' + '0'.repeat(20),
      vout: 1,
      valueSats: 300_000,
      address: 'tb1qaddress2',
      scriptPubKey: '00140000000000000000000000000000000000000001',
    },
  ],
  outputs: [
    { address: 'tb1qrecipient', amountSats: 700_000, isChange: false },
    { address: 'tb1qchange', amountSats: 99_100, isChange: true },
  ],
  amountSats: 700_000,
  feeSats: 900,
  totalSats: 700_900,
  changeSats: 99_100,
  feeRateSatsPerVByte: 5,
  estimatedVBytes: 180,
  status: 'built',
  createdAt: new Date().toISOString(),
};

const SIGNED: SignedTransaction = {
  rawHex: 'deadbeef01020304',
  txid: TXID,
  builtTransaction: BUILT,
};

const UNSPENT_UTXO: Utxo = {
  txid: 'unspent-txid' + '0'.repeat(20),
  vout: 0,
  valueSats: 200_000,
  address: 'tb1qother',
  isConfirmed: true,
};

function makeBlockchainProvider(broadcastResult = TXID): jest.Mocked<BlockchainProvider> {
  return {
    getBalance: jest.fn(),
    getUtxos: jest.fn(),
    getTransactions: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn().mockResolvedValue(broadcastResult),
  };
}

function makeTxRepo(): jest.Mocked<TransactionRepository> {
  return {
    build: jest.fn(),
    sign: jest.fn(),
    broadcast: jest.fn(),
    list: jest.fn().mockResolvedValue([]),
    upsertAll: jest.fn().mockResolvedValue(undefined),
  };
}

function makeUtxoRepo(utxos: Utxo[] = []): jest.Mocked<UtxoRepository> {
  return {
    listByWallet: jest.fn().mockResolvedValue(utxos),
    replaceAll: jest.fn().mockResolvedValue(undefined),
    freeze: jest.fn().mockResolvedValue(undefined),
    unfreeze: jest.fn().mockResolvedValue(undefined),
  };
}

function makeUseCase(
  blockchainProvider = makeBlockchainProvider(),
  txRepo = makeTxRepo(),
  utxoRepo = makeUtxoRepo([]),
) {
  return {
    useCase: new BroadcastTransactionUseCase(blockchainProvider, txRepo, utxoRepo),
    txRepo,
    utxoRepo,
    blockchainProvider,
  };
}

describe('BroadcastTransactionUseCase', () => {
  describe('broadcast success', () => {
    it('returns the txid from the blockchain provider', async () => {
      const { useCase } = makeUseCase();
      const result = await useCase.execute(SIGNED, WALLET_ID);
      expect(result.txid).toBe(TXID);
    });

    it('returns a transaction with correct amount, fee, and direction', async () => {
      const { useCase } = makeUseCase();
      const result = await useCase.execute(SIGNED, WALLET_ID);
      expect(result.transaction.amountSats).toBe(BUILT.amountSats);
      expect(result.transaction.feeSats).toBe(BUILT.feeSats);
      expect(result.transaction.direction).toBe('outgoing');
      expect(result.transaction.status).toBe('pending');
    });

    it('saves the transaction locally via transactionRepository', async () => {
      const txRepo = makeTxRepo();
      const { useCase } = makeUseCase(makeBlockchainProvider(), txRepo);
      await useCase.execute(SIGNED, WALLET_ID);

      expect(txRepo.upsertAll).toHaveBeenCalledTimes(1);
      const [savedWalletId, savedTxs] = txRepo.upsertAll.mock.calls[0];
      expect(savedWalletId).toBe(WALLET_ID);
      expect(savedTxs).toHaveLength(1);
      expect(savedTxs[0].txid).toBe(TXID);
    });

    it('removes spent UTXOs from the repository', async () => {
      const spentUtxo: Utxo = {
        txid: BUILT.inputs[0].txid,
        vout: BUILT.inputs[0].vout,
        valueSats: 500_000,
        address: 'tb1qaddress',
        isConfirmed: true,
      };
      const utxoRepo = makeUtxoRepo([spentUtxo, UNSPENT_UTXO]);
      const { useCase } = makeUseCase(makeBlockchainProvider(), makeTxRepo(), utxoRepo);

      await useCase.execute(SIGNED, WALLET_ID);

      expect(utxoRepo.replaceAll).toHaveBeenCalledTimes(1);
      const [savedWalletId, remaining] = utxoRepo.replaceAll.mock.calls[0];
      expect(savedWalletId).toBe(WALLET_ID);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].txid).toBe(UNSPENT_UTXO.txid);
    });

    it('removes all inputs when all UTXOs are spent', async () => {
      const allSpent = BUILT.inputs.map(i => ({
        txid: i.txid,
        vout: i.vout,
        valueSats: i.valueSats,
        address: i.address,
        isConfirmed: true,
      }));
      const utxoRepo = makeUtxoRepo(allSpent);
      const { useCase } = makeUseCase(makeBlockchainProvider(), makeTxRepo(), utxoRepo);

      await useCase.execute(SIGNED, WALLET_ID);

      const [, remaining] = utxoRepo.replaceAll.mock.calls[0];
      expect(remaining).toHaveLength(0);
    });

    it('keeps all UTXOs when none match inputs', async () => {
      const utxoRepo = makeUtxoRepo([UNSPENT_UTXO]);
      const { useCase } = makeUseCase(makeBlockchainProvider(), makeTxRepo(), utxoRepo);

      await useCase.execute(SIGNED, WALLET_ID);

      const [, remaining] = utxoRepo.replaceAll.mock.calls[0];
      expect(remaining).toHaveLength(1);
    });
  });

  describe('broadcast failure', () => {
    it('throws when broadcastTransaction fails', async () => {
      const blockchainProvider = makeBlockchainProvider();
      blockchainProvider.broadcastTransaction.mockRejectedValue(
        new AppError('Broadcast failed', 'BROADCAST_ERROR'),
      );
      const { useCase } = makeUseCase(blockchainProvider);

      await expect(useCase.execute(SIGNED, WALLET_ID)).rejects.toThrow('Broadcast failed');
    });

    it('does not save the transaction when broadcast throws', async () => {
      const blockchainProvider = makeBlockchainProvider();
      blockchainProvider.broadcastTransaction.mockRejectedValue(new Error('Network error'));
      const txRepo = makeTxRepo();
      const { useCase } = makeUseCase(blockchainProvider, txRepo);

      await expect(useCase.execute(SIGNED, WALLET_ID)).rejects.toThrow();
      expect(txRepo.upsertAll).not.toHaveBeenCalled();
    });

    it('does not update UTXOs when broadcast throws', async () => {
      const blockchainProvider = makeBlockchainProvider();
      blockchainProvider.broadcastTransaction.mockRejectedValue(new Error('Network error'));
      const utxoRepo = makeUtxoRepo([UNSPENT_UTXO]);
      const { useCase } = makeUseCase(blockchainProvider, makeTxRepo(), utxoRepo);

      await expect(useCase.execute(SIGNED, WALLET_ID)).rejects.toThrow();
      expect(utxoRepo.replaceAll).not.toHaveBeenCalled();
    });
  });
});
