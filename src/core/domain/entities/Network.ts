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
  personalNodeUrl?: string;
  personalNodePort?: number;
  personalNodeAuthToken?: string;
};

export type NodeConnectionTestResult = {
  status: NodeConnectionStatus;
  expectedNetwork: BitcoinNetwork;
  actualNetwork?: BitcoinNetwork;
};
