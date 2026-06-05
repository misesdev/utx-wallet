import type { BitcoinNetwork } from '../../domain/entities/Network';

export type WalletSummaryDto = {
  id: string;
  name: string;
  network: BitcoinNetwork;
  balanceSats: number;
};
