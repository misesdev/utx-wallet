import type { AddressOrigin } from '../entities/AddressOrigin';
import type { Utxo } from '../entities/Utxo';
import type { WalletAddress } from '../entities/WalletAddress';

export type AccountSummary = AddressOrigin & {
  confirmedBalanceSats: number;
  pendingBalanceSats: number;
  totalBalanceSats: number;
  addressCount: number;
};

function emptySummary(origin: AddressOrigin): AccountSummary {
  return {
    ...origin,
    confirmedBalanceSats: 0,
    pendingBalanceSats: 0,
    totalBalanceSats: 0,
    addressCount: 0,
  };
}

export function calculateAccountSummaries(
  origins: AddressOrigin[],
  addresses: WalletAddress[],
  utxos: Utxo[],
): AccountSummary[] {
  const summaries = new Map<string, AccountSummary>();
  for (const origin of origins) {
    summaries.set(origin.id, emptySummary(origin));
  }

  const addressToOrigin = new Map<string, string>();
  for (const address of addresses) {
    addressToOrigin.set(address.address, address.originId);
    const summary = summaries.get(address.originId);
    if (summary) summary.addressCount += 1;
  }

  for (const utxo of utxos) {
    if (utxo.isFrozen) continue;
    const originId = addressToOrigin.get(utxo.address);
    if (!originId) continue;
    const summary = summaries.get(originId);
    if (!summary) continue;
    if (utxo.isConfirmed) {
      summary.confirmedBalanceSats += utxo.valueSats;
    } else {
      summary.pendingBalanceSats += utxo.valueSats;
    }
    summary.totalBalanceSats = summary.confirmedBalanceSats + summary.pendingBalanceSats;
  }

  return Array.from(summaries.values());
}

export function findAccountSummary(
  summaries: AccountSummary[],
  originId?: string,
): AccountSummary | null {
  if (originId) return summaries.find(summary => summary.id === originId) ?? null;
  return summaries.find(summary => summary.type === 'default') ?? summaries[0] ?? null;
}
