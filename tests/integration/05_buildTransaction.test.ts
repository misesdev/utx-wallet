/**
 * Integration: Prepare Send (Build Transaction) Flow
 *
 * Tests: TransactionService.buildTransaction() → BuildTransactionUseCase
 * → CoinSelectionService + FeeEstimationService → UtxoRepositoryImpl
 * Uses real Address.getScriptPubkey from bitcoin-tx-lib
 *
 * Real: coin selection, fee estimation, UTXO reading, scriptPubKey derivation
 * Mocked: WalletAddressProvider (change address), InMemoryDatabase for UTXOs
 */
import { TransactionService } from '../../src/core/application/services/TransactionService';
import { BuildTransactionUseCase, DUST_THRESHOLD_SATS } from '../../src/core/domain/usecases/transaction/BuildTransactionUseCase';
import { SignTransactionUseCase } from '../../src/core/domain/usecases/transaction/SignTransactionUseCase';
import { BroadcastTransactionUseCase } from '../../src/core/domain/usecases/transaction/BroadcastTransactionUseCase';
import { CoinSelectionService } from '../../src/core/domain/services/CoinSelectionService';
import { FeeEstimationService } from '../../src/core/domain/services/FeeEstimationService';
import { UtxoRepositoryImpl } from '../../src/core/infrastructure/repositories/UtxoRepositoryImpl';
import { UtxoStorage } from '../../src/core/infrastructure/storage/UtxoStorage';
import type { WalletAddressProvider } from '../../src/core/domain/repositories/WalletAddressProvider';
import type { Utxo } from '../../src/core/domain/entities/Utxo';
import { InMemoryDatabase } from './helpers/InMemoryDatabase';

// Known mainnet addresses (valid format for bitcoin-tx-lib Address.getScriptPubkey)
const RECIPIENT = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const CHANGE_ADDR = 'bc1q2huh508fyvu04z98cvnrd2stuzyqzwe80eqark';
const INPUT_ADDR = 'bc1qp3q5wxq3t4y5yy7v6p20clzf9r5rgy0n3z5erz';
const WALLET_ID = 'wallet-build-test';
const FEE_RATE = 5;

function makeUtxo(txid: string, valueSats: number, vout = 0, extras: Partial<Utxo> = {}): Utxo {
  return { txid, vout, valueSats, address: INPUT_ADDR, isConfirmed: true, ...extras };
}

function makeChangeProvider(addr = CHANGE_ADDR): jest.Mocked<WalletAddressProvider> {
  return {
    getReceiveAddress: jest.fn(),
    getChangeAddress: jest.fn().mockResolvedValue(addr),
  };
}

function makeTransactionService(utxos: Utxo[], changeAddr = CHANGE_ADDR) {
  const db = new InMemoryDatabase();
  const utxoRepo = new UtxoRepositoryImpl(new UtxoStorage(db));
  const feeEstimation = new FeeEstimationService();
  const coinSelection = new CoinSelectionService(feeEstimation);
  const buildUseCase = new BuildTransactionUseCase(
    utxoRepo, coinSelection, feeEstimation, makeChangeProvider(changeAddr),
  );

  // Pre-seed UTXOs
  db.seed('utxos', utxos.map(u => ({
    txid: u.txid, vout: u.vout, value_sats: u.valueSats, address: u.address,
    is_confirmed: u.isConfirmed ? 1 : 0, is_frozen: u.isFrozen ? 1 : 0, wallet_id: WALLET_ID,
  })));

  const stubSigner = { sign: jest.fn() } as unknown as jest.Mocked<SignTransactionUseCase>;
  const stubBroadcast = { execute: jest.fn() } as unknown as jest.Mocked<BroadcastTransactionUseCase>;

  return new TransactionService(buildUseCase, stubSigner, stubBroadcast);
}

describe('Integration: Build Transaction', () => {
  it('builds a valid transaction from a single sufficient UTXO', async () => {
    const service = makeTransactionService([makeUtxo('tx1', 500_000)]);
    const built = await service.buildTransaction({
      walletId: WALLET_ID,
      walletNetwork: 'mainnet',
      toAddress: RECIPIENT,
      amountSats: 100_000,
      feeRateSatsPerVByte: FEE_RATE,
    });

    expect(built.inputs).toHaveLength(1);
    expect(built.inputs[0].txid).toBe('tx1');
    expect(built.amountSats).toBe(100_000);
    expect(built.feeSats).toBeGreaterThan(0);
    expect(built.status).toBe('built');
  });

  it('derives scriptPubKey for each input via bitcoin-tx-lib', async () => {
    const service = makeTransactionService([makeUtxo('tx1', 500_000)]);
    const built = await service.buildTransaction({
      walletId: WALLET_ID,
      walletNetwork: 'mainnet',
      toAddress: RECIPIENT,
      amountSats: 100_000,
      feeRateSatsPerVByte: FEE_RATE,
    });

    expect(built.inputs[0].scriptPubKey).toBeTruthy();
    expect(typeof built.inputs[0].scriptPubKey).toBe('string');
    expect(built.inputs[0].scriptPubKey.length).toBeGreaterThan(0);
  });

  it('selects multiple UTXOs when no single one is sufficient', async () => {
    const utxos = [
      makeUtxo('tx1', 50_000, 0),
      makeUtxo('tx2', 50_000, 0),
      makeUtxo('tx3', 50_000, 0),
    ];
    const service = makeTransactionService(utxos);
    const built = await service.buildTransaction({
      walletId: WALLET_ID,
      walletNetwork: 'mainnet',
      toAddress: RECIPIENT,
      amountSats: 100_000,
      feeRateSatsPerVByte: FEE_RATE,
    });

    expect(built.inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('creates a change output when change exceeds dust threshold', async () => {
    const service = makeTransactionService([makeUtxo('tx1', 1_000_000)]);
    const built = await service.buildTransaction({
      walletId: WALLET_ID,
      walletNetwork: 'mainnet',
      toAddress: RECIPIENT,
      amountSats: 100_000,
      feeRateSatsPerVByte: FEE_RATE,
    });

    const changeOutput = built.outputs.find(o => o.isChange);
    expect(changeOutput).toBeDefined();
    expect(changeOutput!.address).toBe(CHANGE_ADDR);
    expect(changeOutput!.amountSats).toBeGreaterThanOrEqual(DUST_THRESHOLD_SATS);
  });

  it('absorbs dust change into the fee instead of creating a tiny output', async () => {
    // Choose amount so change would be < 546 sats
    const fee = new FeeEstimationService().estimateFeeSats(1, 2, FEE_RATE);
    const exactAmount = 500_000 - fee - (DUST_THRESHOLD_SATS - 1);
    const service = makeTransactionService([makeUtxo('tx1', 500_000)]);
    const built = await service.buildTransaction({
      walletId: WALLET_ID,
      walletNetwork: 'mainnet',
      toAddress: RECIPIENT,
      amountSats: exactAmount,
      feeRateSatsPerVByte: FEE_RATE,
    });

    const changeOutput = built.outputs.find(o => o.isChange);
    expect(changeOutput).toBeUndefined();
    expect(built.changeSats).toBe(0);
    // Fee absorbed the dust
    expect(built.feeSats).toBeGreaterThan(fee);
  });

  it('skips frozen UTXOs during coin selection', async () => {
    const utxos = [
      makeUtxo('frozen-tx', 1_000_000, 0, { isFrozen: true }),
      makeUtxo('normal-tx', 500_000, 0),
    ];
    const service = makeTransactionService(utxos);
    const built = await service.buildTransaction({
      walletId: WALLET_ID,
      walletNetwork: 'mainnet',
      toAddress: RECIPIENT,
      amountSats: 100_000,
      feeRateSatsPerVByte: FEE_RATE,
    });

    const txids = built.inputs.map(i => i.txid);
    expect(txids).not.toContain('frozen-tx');
    expect(txids).toContain('normal-tx');
  });

  it('selects largest-first to minimise input count', async () => {
    const utxos = [
      makeUtxo('small', 10_000, 0),
      makeUtxo('medium', 100_000, 0),
      makeUtxo('large', 1_000_000, 0),
    ];
    const service = makeTransactionService(utxos);
    const built = await service.buildTransaction({
      walletId: WALLET_ID,
      walletNetwork: 'mainnet',
      toAddress: RECIPIENT,
      amountSats: 50_000,
      feeRateSatsPerVByte: FEE_RATE,
    });

    expect(built.inputs).toHaveLength(1);
    expect(built.inputs[0].txid).toBe('large');
  });

  it('total outputs + fee = total inputs (conservation)', async () => {
    const service = makeTransactionService([makeUtxo('tx1', 500_000)]);
    const built = await service.buildTransaction({
      walletId: WALLET_ID,
      walletNetwork: 'mainnet',
      toAddress: RECIPIENT,
      amountSats: 100_000,
      feeRateSatsPerVByte: FEE_RATE,
    });

    const totalInputs = built.inputs.reduce((s, i) => s + i.valueSats, 0);
    const totalOutputs = built.outputs.reduce((s, o) => s + o.amountSats, 0);
    expect(totalOutputs + built.feeSats).toBe(totalInputs);
  });

  it('throws INSUFFICIENT_BALANCE when UTXOs do not cover amount + fee', async () => {
    const service = makeTransactionService([makeUtxo('tx1', 1_000)]);
    await expect(
      service.buildTransaction({
        walletId: WALLET_ID,
        walletNetwork: 'mainnet',
        toAddress: RECIPIENT,
        amountSats: 10_000,
        feeRateSatsPerVByte: FEE_RATE,
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
  });

  it('throws BELOW_DUST when amount is below 546 sats', async () => {
    const service = makeTransactionService([makeUtxo('tx1', 500_000)]);
    await expect(
      service.buildTransaction({
        walletId: WALLET_ID,
        walletNetwork: 'mainnet',
        toAddress: RECIPIENT,
        amountSats: DUST_THRESHOLD_SATS - 1,
        feeRateSatsPerVByte: FEE_RATE,
      }),
    ).rejects.toMatchObject({ code: 'BELOW_DUST' });
  });

  it('throws on invalid recipient address', async () => {
    const service = makeTransactionService([makeUtxo('tx1', 500_000)]);
    await expect(
      service.buildTransaction({
        walletId: WALLET_ID,
        walletNetwork: 'mainnet',
        toAddress: 'not-a-bitcoin-address',
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
      }),
    ).rejects.toThrow();
  });
});
