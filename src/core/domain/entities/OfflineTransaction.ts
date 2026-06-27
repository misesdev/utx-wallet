import type { BitcoinNetwork } from './Network';

export type OfflineTransaction = {
  id: string;
  walletId: string;
  network?: BitcoinNetwork;
  rawHex: string;
  txid?: string;
  amountSats?: number;
  feeSats?: number;
  toAddress?: string;
  createdAt: string;
};
