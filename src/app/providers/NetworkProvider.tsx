import React, { createContext, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import type { NetworkConfig } from '../../core/domain/entities/Network';
import { DEFAULT_NETWORK } from '../../shared/constants/networks';
import { NetworkService } from '../../core/application/services/NetworkService';

type NetworkContextValue = {
  networkConfig: NetworkConfig;
  isOnline: boolean;
  setNetworkConfig: (config: NetworkConfig) => Promise<void>;
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
    }),
    [isOnline, networkConfig, networkService],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
