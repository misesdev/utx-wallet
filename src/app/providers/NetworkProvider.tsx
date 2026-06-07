import React, { createContext, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import type { BitcoinNetwork, NetworkConfig, NodeConnectionTestResult } from '../../core/domain/entities/Network';
import { DEFAULT_NETWORK } from '../../shared/constants/networks';
import { NetworkService } from '../../core/application/services/NetworkService';

type NetworkContextValue = {
  networkConfig: NetworkConfig;
  isOnline: boolean;
  setNetworkConfig: (config: NetworkConfig) => Promise<void>;
  changeNetwork: (targetNetwork: BitcoinNetwork, walletNetwork?: BitcoinNetwork) => Promise<NetworkConfig>;
  testNodeConnection: (config: NetworkConfig) => Promise<NodeConnectionTestResult>;
  /** Update the active network to match the selected wallet without changing other settings. */
  syncNetworkToWallet: (walletNetwork: BitcoinNetwork) => Promise<void>;
};

export const NetworkContext = createContext<NetworkContextValue | null>(null);

const fallbackConfig: NetworkConfig = {
  network: DEFAULT_NETWORK,
  connectivityMode: 'online',
  nodeMode: 'public-api',
};

type NetworkProviderProps = PropsWithChildren<{
  networkService: NetworkService;
}>;

export function NetworkProvider({ children, networkService }: NetworkProviderProps) {
  const [networkConfig, setNetworkConfigState] = useState<NetworkConfig>(fallbackConfig);
  const isOnline = networkConfig.connectivityMode === 'online';

  useEffect(() => {
    networkService.getConfig().then(setNetworkConfigState).catch(() => setNetworkConfigState(fallbackConfig));
  }, [networkService]);

  const value = useMemo<NetworkContextValue>(
    () => ({
      networkConfig,
      isOnline,
      setNetworkConfig: async config => {
        await networkService.setConfig(config);
        setNetworkConfigState(config);
      },
      changeNetwork: async (targetNetwork, walletNetwork) => {
        const config = await networkService.changeNetwork(targetNetwork, walletNetwork);
        setNetworkConfigState(config);
        return config;
      },
      testNodeConnection: config => networkService.testNodeConnection(config),
      syncNetworkToWallet: async (walletNetwork) => {
        const updated: NetworkConfig = { ...networkConfig, network: walletNetwork };
        await networkService.setConfig(updated);
        setNetworkConfigState(updated);
      },
    }),
    [isOnline, networkConfig, networkService],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
