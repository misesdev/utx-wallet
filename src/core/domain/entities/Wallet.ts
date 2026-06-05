import type { BitcoinNetwork } from './Network';

export type WalletId = string;

export type WalletStatus = 'locked' | 'unlocked' | 'watch-only';

export type Wallet = {
  id: WalletId;
  name: string;
  network: BitcoinNetwork;
  status: WalletStatus;
  createdAt: string;
};
