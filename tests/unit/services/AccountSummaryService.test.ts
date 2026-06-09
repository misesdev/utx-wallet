import { calculateAccountSummaries, findAccountSummary } from '../../../src/core/domain/services/AccountSummaryService';
import type { AddressOrigin } from '../../../src/core/domain/entities/AddressOrigin';
import type { WalletAddress } from '../../../src/core/domain/entities/WalletAddress';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';

function origin(id: string, accountIndex: number, name = id): AddressOrigin {
  return { id, walletId: 'wallet-1', name, type: accountIndex === 0 ? 'default' : 'custom', accountIndex, createdAt: 'now', archivedAt: null };
}

function address(addressValue: string, originId: string, accountIndex: number): WalletAddress {
  return {
    id: addressValue,
    walletId: 'wallet-1',
    originId,
    originName: originId,
    address: addressValue,
    path: 'm/84',
    accountIndex,
    chain: 'receive',
    index: 0,
    status: 'fresh',
    totalReceivedSats: 0,
    totalSentSats: 0,
    txCount: 0,
    incomingTxCount: 0,
    outgoingTxCount: 0,
    hasUtxos: false,
    isFrozen: false,
    createdAt: 'now',
    usedAt: null,
    lastSyncedAt: null,
  };
}

function utxo(addressValue: string, valueSats: number, isConfirmed = true): Utxo {
  return { txid: addressValue + '-' + valueSats, vout: 0, valueSats, address: addressValue, isConfirmed };
}

describe('AccountSummaryService', () => {
  it('calculates confirmed and pending balance by account', () => {
    const result = calculateAccountSummaries(
      [origin('default', 0, 'Default'), origin('savings', 1, 'Savings')],
      [address('addr-0', 'default', 0), address('addr-1', 'savings', 1)],
      [utxo('addr-0', 10_000), utxo('addr-1', 25_000), utxo('addr-1', 5_000, false)],
    );

    expect(result.find(item => item.id === 'default')).toMatchObject({ confirmedBalanceSats: 10_000, pendingBalanceSats: 0, totalBalanceSats: 10_000 });
    expect(result.find(item => item.id === 'savings')).toMatchObject({ confirmedBalanceSats: 25_000, pendingBalanceSats: 5_000, totalBalanceSats: 30_000 });
  });

  it('uses the default account when no origin is selected', () => {
    const summaries = calculateAccountSummaries([origin('default', 0), origin('other', 1)], [], []);
    expect(findAccountSummary(summaries)?.id).toBe('default');
  });
});
