import type { BitcoinNetwork } from './Network';

export type PersonalNode = {
  id: string;
  label: string;
  url: string;
  port?: number;
  authToken?: string;
  network: BitcoinNetwork;
  priority: number; // lower = higher priority (1 is highest)
};
