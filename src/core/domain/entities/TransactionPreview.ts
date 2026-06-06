export type FeeRateTier = 'economy' | 'normal' | 'fast' | 'custom';

export type TransactionPreview = {
  toAddress: string;
  amountSats: number;
  feeSats: number;
  totalSats: number;
  changeSats: number;
  feeRateSatsPerVByte: number;
  estimatedVBytes: number;
};
