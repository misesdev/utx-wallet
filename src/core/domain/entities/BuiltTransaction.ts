export type BuiltTransactionInput = {
  txid: string;
  vout: number;
  valueSats: number;
  address: string;
  scriptPubKey: string;
};

export type BuiltTransactionOutput = {
  address: string;
  amountSats: number;
  isChange: boolean;
};

export type BuiltTransaction = {
  id: string;
  walletId: string;
  inputs: BuiltTransactionInput[];
  outputs: BuiltTransactionOutput[];
  amountSats: number;
  feeSats: number;
  totalSats: number;
  changeSats: number;
  feeRateSatsPerVByte: number;
  estimatedVBytes: number;
  status: 'built';
  createdAt: string;
};
