import type { PersonalNode } from './PersonalNode';

export type BitcoinNetwork = 'mainnet' | 'testnet' | 'testnet3' | 'testnet4';

export type ConnectivityMode = 'online' | 'offline';

export type NodeConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'network-incompatible'
  | 'authentication-error';

export type NetworkConfig = {
  connectivityMode: ConnectivityMode;
  personalNodes: PersonalNode[];
  allowPublicFallback: boolean;
  // Legacy single-node fields kept only for migration (read-and-strip)
  personalNodeUrl?: string;
  personalNodePort?: number;
  personalNodeAuthToken?: string;
};

export type NodeConnectionTestResult = {
  status: NodeConnectionStatus;
  expectedNetwork: BitcoinNetwork;
  actualNetwork?: BitcoinNetwork;
};
