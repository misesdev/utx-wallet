/**
 * Integration: Freeze / Unfreeze UTXO Flow
 *
 * Tests: WalletService.freezeUtxo/unfreezeUtxo → FreezeUtxoUseCase/UnfreezeUtxoUseCase
 * → UtxoRepositoryImpl → UtxoStorage → InMemoryDatabase
 * Also verifies CoinSelectionService respects the isFrozen flag.
 *
 * Real: use cases, repository impl, storage, CoinSelectionService, FeeEstimationService
 * Mocked: InMemoryDatabase
 */
import { WalletService } from '../../src/core/application/services/WalletService';
import { FreezeUtxoUseCase } from '../../src/core/domain/usecases/wallet/FreezeUtxoUseCase';
import { UnfreezeUtxoUseCase } from '../../src/core/domain/usecases/wallet/UnfreezeUtxoUseCase';
import { LoadUtxosUseCase } from '../../src/core/domain/usecases/wallet/LoadUtxosUseCase';
import { CoinSelectionService } from '../../src/core/domain/services/CoinSelectionService';
import { FeeEstimationService } from '../../src/core/domain/services/FeeEstimationService';
import { UtxoRepositoryImpl } from '../../src/core/infrastructure/repositories/UtxoRepositoryImpl';
import { UtxoStorage } from '../../src/core/infrastructure/storage/UtxoStorage';
import type { Utxo } from '../../src/core/domain/entities/Utxo';
import type { SyncWalletUseCase } from '../../src/core/domain/usecases/wallet/SyncWalletUseCase';
import { InMemoryDatabase } from './helpers/InMemoryDatabase';

const WALLET_ID = 'freeze-wallet';
const TXID_A = 'a'.repeat(64);
const TXID_B = 'b'.repeat(64);
const RECIPIENT = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

function makeUtxo(txid: string, valueSats: number, vout = 0, isFrozen = false): Utxo {
  return { txid, vout, valueSats, address: RECIPIENT, isConfirmed: true, isFrozen };
}

function makeSetup(initialUtxos: Utxo[] = []) {
  const db = new InMemoryDatabase();
  const utxoRepo = new UtxoRepositoryImpl(new UtxoStorage(db));
  const feeEstimation = new FeeEstimationService();
  const coinSelection = new CoinSelectionService(feeEstimation);

  // Pre-seed UTXOs
  db.seed('utxos', initialUtxos.map(u => ({
    txid: u.txid, vout: u.vout, value_sats: u.valueSats, address: u.address,
    is_confirmed: u.isConfirmed ? 1 : 0, is_frozen: u.isFrozen ? 1 : 0, wallet_id: WALLET_ID,
  })));

  const freezeUC = new FreezeUtxoUseCase(utxoRepo);
  const unfreezeUC = new UnfreezeUtxoUseCase(utxoRepo);
  const loadUtxos = new LoadUtxosUseCase(utxoRepo);


  const stubSyncUseCase = { execute: jest.fn() } as unknown as SyncWalletUseCase;

  const service = new WalletService(
    { execute: jest.fn() } as never,
    { execute: jest.fn() } as never,
    { execute: jest.fn() } as never,
    { execute: jest.fn() } as never,
    { execute: jest.fn() } as never,
    { execute: jest.fn() } as never,
    { execute: jest.fn() } as never,
    { execute: jest.fn().mockResolvedValue([]) } as never,
    loadUtxos,
    stubSyncUseCase,
    freezeUC,
    unfreezeUC,
  );

  return { service, utxoRepo, freezeUC, unfreezeUC, coinSelection, feeEstimation, db };
}

describe('Integration: Freeze / Unfreeze UTXO', () => {
  it('freezeUtxo sets isFrozen = true in storage', async () => {
    const { service, utxoRepo } = makeSetup([makeUtxo(TXID_A, 100_000)]);

    await service.freezeUtxo(WALLET_ID, TXID_A, 0);

    const utxos = await utxoRepo.listByWallet(WALLET_ID);
    expect(utxos).toHaveLength(1);
    expect(utxos[0].isFrozen).toBe(true);
  });

  it('unfreezeUtxo sets isFrozen = false in storage', async () => {
    const { service, utxoRepo } = makeSetup([makeUtxo(TXID_A, 100_000, 0, true)]);

    await service.unfreezeUtxo(WALLET_ID, TXID_A, 0);

    const utxos = await utxoRepo.listByWallet(WALLET_ID);
    expect(utxos[0].isFrozen).toBe(false);
  });

  it('freeze does not affect other UTXOs in the same wallet', async () => {
    const { service, utxoRepo } = makeSetup([
      makeUtxo(TXID_A, 100_000),
      makeUtxo(TXID_B, 200_000),
    ]);

    await service.freezeUtxo(WALLET_ID, TXID_A, 0);

    const utxos = await utxoRepo.listByWallet(WALLET_ID);
    const b = utxos.find(u => u.txid === TXID_B);
    expect(b?.isFrozen).toBeFalsy();
  });

  it('frozen UTXO is excluded from CoinSelection', async () => {
    const { utxoRepo, coinSelection } = makeSetup([
      makeUtxo(TXID_A, 1_000_000, 0, true),
      makeUtxo(TXID_B, 200_000),
    ]);

    const utxos = await utxoRepo.listByWallet(WALLET_ID);
    const { selectedUtxos } = coinSelection.select(utxos, 100_000, 5);

    expect(selectedUtxos.map(u => u.txid)).not.toContain(TXID_A);
    expect(selectedUtxos.map(u => u.txid)).toContain(TXID_B);
  });

  it('unfrozen UTXO is included in CoinSelection', async () => {
    const { service, utxoRepo, coinSelection } = makeSetup([
      makeUtxo(TXID_A, 1_000_000, 0, true),
    ]);

    await service.unfreezeUtxo(WALLET_ID, TXID_A, 0);

    const utxos = await utxoRepo.listByWallet(WALLET_ID);
    const { selectedUtxos } = coinSelection.select(utxos, 100_000, 5);

    expect(selectedUtxos.map(u => u.txid)).toContain(TXID_A);
  });

  it('CoinSelection throws INSUFFICIENT_BALANCE when all UTXOs are frozen', async () => {
    const { utxoRepo, coinSelection } = makeSetup([
      makeUtxo(TXID_A, 1_000_000, 0, true),
      makeUtxo(TXID_B, 1_000_000, 0, true),
    ]);

    const utxos = await utxoRepo.listByWallet(WALLET_ID);
    expect(() => coinSelection.select(utxos, 100_000, 5)).toThrow();
  });

  it('freezes and unfreezes the same UTXO multiple times', async () => {
    const { service, utxoRepo } = makeSetup([makeUtxo(TXID_A, 100_000)]);

    await service.freezeUtxo(WALLET_ID, TXID_A, 0);
    let utxos = await utxoRepo.listByWallet(WALLET_ID);
    expect(utxos[0].isFrozen).toBe(true);

    await service.unfreezeUtxo(WALLET_ID, TXID_A, 0);
    utxos = await utxoRepo.listByWallet(WALLET_ID);
    expect(utxos[0].isFrozen).toBe(false);

    await service.freezeUtxo(WALLET_ID, TXID_A, 0);
    utxos = await utxoRepo.listByWallet(WALLET_ID);
    expect(utxos[0].isFrozen).toBe(true);
  });

  it('loadUtxos returns the frozen state correctly', async () => {
    const { service } = makeSetup([makeUtxo(TXID_A, 100_000)]);

    await service.freezeUtxo(WALLET_ID, TXID_A, 0);
    const utxos = await service.listUtxos(WALLET_ID);

    expect(utxos[0].isFrozen).toBe(true);
  });

  it('selects only non-frozen UTXOs when mixture is present', async () => {
    const { service, utxoRepo, coinSelection } = makeSetup([
      makeUtxo(TXID_A, 1_000_000, 0, false),
      makeUtxo(TXID_B, 500_000, 0, false),
    ]);

    await service.freezeUtxo(WALLET_ID, TXID_B, 0);

    const utxos = await utxoRepo.listByWallet(WALLET_ID);
    const { selectedUtxos } = coinSelection.select(utxos, 100_000, 5);

    expect(selectedUtxos).toHaveLength(1);
    expect(selectedUtxos[0].txid).toBe(TXID_A);
  });
});
