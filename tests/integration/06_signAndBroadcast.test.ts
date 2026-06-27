/**
 * Integration: Sign & Broadcast Flow
 *
 * Tests: TransactionService.signTransaction() + broadcastTransaction()
 * → WalletTransactionSigner (real HDWallet signing via bitcoin-tx-lib)
 * → BroadcastTransactionUseCase → TransactionRepositoryImpl + UtxoRepositoryImpl
 *
 * Real: HD signing (bitcoin-tx-lib), repository impls, storage
 * Mocked: BlockchainProvider.broadcastTransaction, InMemoryDatabase + SecureStorage
 */
import { HDWallet, Address } from 'bitcoin-tx-lib';
import { TransactionService } from '../../src/core/application/services/TransactionService';
import { BuildTransactionUseCase } from '../../src/core/domain/usecases/transaction/BuildTransactionUseCase';
import { SignTransactionUseCase } from '../../src/core/domain/usecases/transaction/SignTransactionUseCase';
import { BroadcastTransactionUseCase } from '../../src/core/domain/usecases/transaction/BroadcastTransactionUseCase';
import { CoinSelectionService } from '../../src/core/domain/services/CoinSelectionService';
import { FeeEstimationService } from '../../src/core/domain/services/FeeEstimationService';
import { WalletTransactionSigner } from '../../src/core/infrastructure/adapters/WalletTransactionSigner';
import { WalletKeyStorage } from '../../src/core/infrastructure/storage/WalletKeyStorage';
import { UtxoRepositoryImpl } from '../../src/core/infrastructure/repositories/UtxoRepositoryImpl';
import { UtxoStorage } from '../../src/core/infrastructure/storage/UtxoStorage';
import { TransactionRepositoryImpl } from '../../src/core/infrastructure/repositories/TransactionRepositoryImpl';
import { TransactionStorage } from '../../src/core/infrastructure/storage/TransactionStorage';
import type { WalletAddressProvider } from '../../src/core/domain/repositories/WalletAddressProvider';
import type { BlockchainProvider } from '../../src/core/domain/repositories/BlockchainProvider';
import type { BuiltTransaction } from '../../src/core/domain/entities/BuiltTransaction';
import type { Utxo } from '../../src/core/domain/entities/Utxo';
import { createSecureStorageMock } from '../mocks/storage';
import { InMemoryDatabase } from './helpers/InMemoryDatabase';

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const WALLET_ID = 'sign-broadcast-wallet';

// Derive actual testnet addresses + scriptPubKeys from the known mnemonic
function deriveAddr(index: number, change: 0 | 1 = 0): string {
  const { wallet } = HDWallet.import(TEST_MNEMONIC, undefined, {
    network: 'testnet',
    purpose: 84,
  });
  return wallet.getAddress(index, { change });
}

function makeBlockchainProvider(broadcastResult = 'mock-txid'): jest.Mocked<BlockchainProvider> {
  return {
    getBalance: jest.fn(),
    getUtxos: jest.fn(),
    getTransactions: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn().mockResolvedValue(broadcastResult),
    getRawTransaction: jest.fn(),
  };
}

function makeSetup(provider: jest.Mocked<BlockchainProvider>) {
  const db = new InMemoryDatabase();
  const secureStorage = createSecureStorageMock();
  const walletKeyStorage = new WalletKeyStorage(secureStorage);
  const utxoRepo = new UtxoRepositoryImpl(new UtxoStorage(db));
  const txRepo = new TransactionRepositoryImpl(new TransactionStorage(db));
  const signer = new WalletTransactionSigner(walletKeyStorage);
  const feeEstimation = new FeeEstimationService();
  const coinSelection = new CoinSelectionService(feeEstimation);

  const changeProvider: jest.Mocked<WalletAddressProvider> = {
    getReceiveAddress: jest.fn(),
    getChangeAddress: jest.fn().mockResolvedValue(deriveAddr(0, 1)),
  };

  const buildUseCase = new BuildTransactionUseCase(
    utxoRepo, coinSelection, feeEstimation, changeProvider,
  );
  const signUseCase = new SignTransactionUseCase(signer);
  const broadcastUseCase = new BroadcastTransactionUseCase(provider, txRepo, utxoRepo);

  return {
    service: new TransactionService(buildUseCase, signUseCase, broadcastUseCase),
    walletKeyStorage,
    utxoRepo,
    txRepo,
    db,
  };
}

async function makeBuiltTxWithRealInputs(setup: ReturnType<typeof makeSetup>): Promise<BuiltTransaction> {
  const inputAddr = deriveAddr(0);
  const recipientAddr = deriveAddr(1); // send to index 1 to avoid self-sending
  const scriptPubKey = Address.getScriptPubkey(inputAddr);

  const utxo: Utxo = {
    txid: 'a'.repeat(64),
    vout: 0,
    valueSats: 100_000,
    address: inputAddr,
    isConfirmed: true,
  };

  // Pre-seed UTXO so build can find it
  setup.db.seed('utxos', [{
    txid: utxo.txid, vout: 0, value_sats: 100_000, address: inputAddr,
    is_confirmed: 1, is_frozen: 0, wallet_id: WALLET_ID,
  }]);

  await setup.walletKeyStorage.store(WALLET_ID, TEST_MNEMONIC);

  return {
    id: 'built-1',
    walletId: WALLET_ID,
    inputs: [{ txid: utxo.txid, vout: 0, valueSats: 100_000, address: inputAddr, scriptPubKey }],
    outputs: [{ address: recipientAddr, amountSats: 80_000, isChange: false }],
    amountSats: 80_000,
    feeSats: 20_000,
    totalSats: 100_000,
    changeSats: 0,
    feeRateSatsPerVByte: 5,
    estimatedVBytes: 110,
    status: 'built',
    createdAt: new Date().toISOString(),
  };
}

describe('Integration: Sign & Broadcast', () => {
  it('signs a transaction and returns a non-empty rawHex', async () => {
    const provider = makeBlockchainProvider();
    const setup = makeSetup(provider);
    const built = await makeBuiltTxWithRealInputs(setup);

    const signed = await setup.service.signTransaction({
      builtTransaction: built,
      walletId: WALLET_ID,
      network: 'testnet4',
    });

    expect(typeof signed.rawHex).toBe('string');
    expect(signed.rawHex.length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/.test(signed.rawHex)).toBe(true);
  });

  it('signed transaction has a valid txid (64-char hex)', async () => {
    const provider = makeBlockchainProvider();
    const setup = makeSetup(provider);
    const built = await makeBuiltTxWithRealInputs(setup);

    const signed = await setup.service.signTransaction({
      builtTransaction: built,
      walletId: WALLET_ID,
      network: 'testnet4',
    });

    expect(typeof signed.txid).toBe('string');
    expect(signed.txid.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(signed.txid)).toBe(true);
  });

  it('broadcast calls blockchain provider with the signed rawHex', async () => {
    const provider = makeBlockchainProvider();
    const setup = makeSetup(provider);
    const built = await makeBuiltTxWithRealInputs(setup);

    const signed = await setup.service.signTransaction({
      builtTransaction: built,
      walletId: WALLET_ID,
      network: 'testnet4',
    });
    await setup.service.broadcastTransaction(signed, WALLET_ID, 'testnet4');

    expect(provider.broadcastTransaction).toHaveBeenCalledWith(signed.rawHex, 'testnet4');
  });

  it('stores the broadcast transaction in local storage', async () => {
    const provider = makeBlockchainProvider('real-txid-abc');
    const setup = makeSetup(provider);
    const built = await makeBuiltTxWithRealInputs(setup);

    const signed = await setup.service.signTransaction({
      builtTransaction: built,
      walletId: WALLET_ID,
      network: 'testnet4',
    });
    await setup.service.broadcastTransaction(signed, WALLET_ID, 'testnet4');

    const txs = await setup.txRepo.list(WALLET_ID);
    expect(txs).toHaveLength(1);
    expect(txs[0].txid).toBe('real-txid-abc');
    expect(txs[0].direction).toBe('outgoing');
    expect(txs[0].status).toBe('pending');
    expect(txs[0].amountSats).toBe(80_000);
  });

  it('removes spent UTXOs from storage after broadcast', async () => {
    const provider = makeBlockchainProvider();
    const setup = makeSetup(provider);
    const built = await makeBuiltTxWithRealInputs(setup);

    let utxosBefore = await setup.utxoRepo.listByWallet(WALLET_ID);
    expect(utxosBefore).toHaveLength(1);

    const signed = await setup.service.signTransaction({
      builtTransaction: built,
      walletId: WALLET_ID,
      network: 'testnet4',
    });
    await setup.service.broadcastTransaction(signed, WALLET_ID, 'testnet4');

    const utxosAfter = await setup.utxoRepo.listByWallet(WALLET_ID);
    expect(utxosAfter).toHaveLength(0);
  });

  it('propagates provider error and leaves UTXOs intact', async () => {
    const provider = makeBlockchainProvider();
    provider.broadcastTransaction.mockRejectedValue(new Error('Network error'));
    const setup = makeSetup(provider);
    const built = await makeBuiltTxWithRealInputs(setup);

    const signed = await setup.service.signTransaction({
      builtTransaction: built,
      walletId: WALLET_ID,
      network: 'testnet4',
    });

    await expect(setup.service.broadcastTransaction(signed, WALLET_ID, 'testnet4')).rejects.toThrow('Network error');

    const utxos = await setup.utxoRepo.listByWallet(WALLET_ID);
    expect(utxos).toHaveLength(1);
  });
});
