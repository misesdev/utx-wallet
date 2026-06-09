import type { RawTxInput } from '../repositories/BlockchainProvider';

export type RbfIneligibilityReason =
  | 'already-confirmed'
  | 'no-rbf-signal'
  | 'no-change'
  | 'watch-only';

export type RbfInfo = {
  originalTxid: string;
  isRbfEligible: boolean;
  ineligibilityReason?: RbfIneligibilityReason;
  toAddress: string;
  recipientAmountSats: number;
  changeAddress: string;
  changeAmountSats: number;
  currentFeeSats: number;
  currentFeeRate: number;
  estimatedVBytes: number;
  rawInputs: RawTxInput[];
};
