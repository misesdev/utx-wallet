import type { PersonalNode } from './PersonalNode';

export type BitcoinNetwork = 'mainnet' | 'testnet' | 'testnet3' | 'testnet4';

export type ConnectivityMode = 'online' | 'offline';

export type NodeMode = 'public-api' | 'personal-node';

export type NodeConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'network-incompatible'
  | 'authentication-error';

export type NetworkConfig = {
  network: BitcoinNetwork;
  connectivityMode: ConnectivityMode;
  nodeMode: NodeMode;
  // Legacy single-node fields kept for backward compatibility — use personalNodes instead
  personalNodeUrl?: string;
  personalNodePort?: number;
  personalNodeAuthToken?: string;
  // Multi-node configuration
  personalNodes?: PersonalNode[];
  allowPublicFallback?: boolean; // default false (privacy-first: don't fall back to public API)
};

export type NodeConnectionTestResult = {
  status: NodeConnectionStatus;
  expectedNetwork: BitcoinNetwork;
  actualNetwork?: BitcoinNetwork;
};
