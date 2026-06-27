export type AddressStatus =
  | 'fresh'
  | 'reserved'
  | 'received'
  | 'spent_once'
  | 'change'
  | 'archived'
  | 'inconsistent';

export type AddressChain = 'receive' | 'change';

export type WalletAddress = {
  id: string;
  walletId: string;
  originId: string;
  originName: string;
  address: string;
  path: string;
  accountIndex: number;
  chain: AddressChain;
  index: number;
  status: AddressStatus;
  totalReceivedSats: number;
  totalSentSats: number;
  txCount: number;
  incomingTxCount: number;
  outgoingTxCount: number;
  hasUtxos: boolean;
  isFrozen: boolean;
  createdAt: string;
  usedAt: string | null;
  lastSyncedAt: string | null;
};

export const ADDRESS_POLICY = {
  minAvailableReceive: 3,
  // Change pool uses a larger target than receive because change addresses are created
  // automatically during sends. 5 provides enough buffer for in-flight transactions
  // while staying well within the BIP44 gap-limit (20) so wallet import always
  // discovers all funds.
  minAvailableChange: 5,
  gapLimit: 20,
} as const;
