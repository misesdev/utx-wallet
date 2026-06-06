import { SyncBalanceUseCase } from '../../../src/core/domain/usecases/wallet/SyncBalanceUseCase';
import type { UtxoRepository } from '../../../src/core/domain/repositories/UtxoRepository';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';

const WALLET_ID = 'wallet-1';

function makeRepo(utxos: Utxo[]): jest.Mocked<UtxoRepository> {
  return {
    listByWallet: jest.fn().mockResolvedValue(utxos),
    replaceAll: jest.fn(),
    freeze: jest.fn().mockResolvedValue(undefined),
    unfreeze: jest.fn().mockResolvedValue(undefined),
  };
}

function utxo(valueSats: number, isConfirmed: boolean): Utxo {
  return { txid: `tx-${valueSats}`, vout: 0, valueSats, address: 'tb1q', isConfirmed };
}

describe('SyncBalanceUseCase', () => {
  it('sums confirmed UTXOs for confirmedSats', async () => {
    const repo = makeRepo([utxo(100_000, true), utxo(200_000, true)]);
    const result = await new SyncBalanceUseCase(repo).execute(WALLET_ID);
    expect(result.confirmedSats).toBe(300_000);
  });

  it('sums unconfirmed UTXOs for pendingSats', async () => {
    const repo = makeRepo([utxo(50_000, false), utxo(30_000, false)]);
    const result = await new SyncBalanceUseCase(repo).execute(WALLET_ID);
    expect(result.pendingSats).toBe(80_000);
  });

  it('separates confirmed and pending correctly when both types present', async () => {
    const repo = makeRepo([utxo(100_000, true), utxo(50_000, false), utxo(25_000, true)]);
    const result = await new SyncBalanceUseCase(repo).execute(WALLET_ID);
    expect(result.confirmedSats).toBe(125_000);
    expect(result.pendingSats).toBe(50_000);
  });

  it('returns zero balance when wallet has no UTXOs', async () => {
    const result = await new SyncBalanceUseCase(makeRepo([])).execute(WALLET_ID);
    expect(result.confirmedSats).toBe(0);
    expect(result.pendingSats).toBe(0);
  });

  it('passes the walletId to the repository', async () => {
    const repo = makeRepo([]);
    await new SyncBalanceUseCase(repo).execute(WALLET_ID);
    expect(repo.listByWallet).toHaveBeenCalledWith(WALLET_ID);
  });
});
