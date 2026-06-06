export type OfflineTransaction = {
  id: string;
  walletId: string;
  rawHex: string;
  txid?: string;
  amountSats?: number;
  feeSats?: number;
  toAddress?: string;
  createdAt: string;
};
