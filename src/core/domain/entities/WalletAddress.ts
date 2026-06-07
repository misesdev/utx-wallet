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
  minAvailableChange: 3,
  gapLimit: 20,
} as const;
