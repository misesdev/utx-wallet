import type { Transaction } from './Transaction';

export type TransactionDetail = Transaction & {
  blockHeight?: number;
  blockTime?: number;
  confirmations?: number;
  isConfirmed: boolean;
  explorerUrl: string;
};
