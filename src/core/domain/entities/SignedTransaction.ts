import type { BuiltTransaction } from './BuiltTransaction';

export type SignedTransaction = {
  rawHex: string;
  txid: string;
  builtTransaction: BuiltTransaction;
};
