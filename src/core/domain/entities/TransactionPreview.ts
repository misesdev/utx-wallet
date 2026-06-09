export type FeeRateTier = 'economy' | 'normal' | 'fast' | 'custom';

export type TransactionPreview = {
  toAddress: string;
  amountSats: number;            // user-requested amount
  recipientAmountSats: number;   // actual amount received by recipient
  feeSats: number;
  totalSats: number;             // total debited from sender's wallet
  changeSats: number;
  feeRateSatsPerVByte: number;
  estimatedVBytes: number;
  subtractFeeFromAmount: boolean;
};
