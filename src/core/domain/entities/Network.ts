export type BitcoinNetwork = 'mainnet' | 'testnet' | 'testnet3' | 'testnet4';

export type ConnectivityMode = 'online' | 'offline';

export type NodeMode = 'public-api' | 'personal-node';

export type NetworkConfig = {
  network: BitcoinNetwork;
  connectivityMode: ConnectivityMode;
  nodeMode: NodeMode;
  personalNodeUrl?: string;
};
