export type TransactionDirection = 'incoming' | 'outgoing';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export type Transaction = {
  id: string;
  txid?: string;
  amountSats: number;
  feeSats?: number;
  direction: TransactionDirection;
  status: TransactionStatus;
  createdAt: string;
};

export type TransactionDraft = {
  toAddress: string;
  amountSats: number;
  feeRateSatsPerVByte?: number;
};
