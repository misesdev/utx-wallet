import React, { createContext, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import type { NetworkConfig, NodeConnectionTestResult } from '../../core/domain/entities/Network';
import type { PersonalNode } from '../../core/domain/entities/PersonalNode';
import { NetworkService } from '../../core/application/services/NetworkService';

type NetworkContextValue = {
  networkConfig: NetworkConfig;
  isOnline: boolean;
  setNetworkConfig: (config: NetworkConfig) => Promise<void>;
  testNodeConnection: (config: NetworkConfig) => Promise<NodeConnectionTestResult>;
  testPersonalNode: (node: PersonalNode) => Promise<NodeConnectionTestResult>;
  // Personal node CRUD
  addPersonalNode: (input: Omit<PersonalNode, 'id'>) => Promise<PersonalNode>;
  removePersonalNode: (nodeId: string) => Promise<void>;
  updatePersonalNode: (node: PersonalNode) => Promise<void>;
  reorderPersonalNodes: (orderedIds: string[]) => Promise<void>;
  setPublicFallback: (enabled: boolean) => Promise<void>;
};

export const NetworkContext = createContext<NetworkContextValue | null>(null);

const fallbackConfig: NetworkConfig = {
  connectivityMode: 'online',
  personalNodes: [],
  allowPublicFallback: false,
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
      testNodeConnection: config => networkService.testNodeConnection(config),
      testPersonalNode: node => networkService.testPersonalNode(node),
      addPersonalNode: async input => {
        const node = await networkService.addPersonalNode(input);
        const updated = await networkService.getConfig();
        setNetworkConfigState(updated);
        return node;
      },
      removePersonalNode: async nodeId => {
        await networkService.removePersonalNode(nodeId);
        const updated = await networkService.getConfig();
        setNetworkConfigState(updated);
      },
      updatePersonalNode: async node => {
        await networkService.updatePersonalNode(node);
        const updated = await networkService.getConfig();
        setNetworkConfigState(updated);
      },
      reorderPersonalNodes: async orderedIds => {
        await networkService.reorderPersonalNodes(orderedIds);
        const updated = await networkService.getConfig();
        setNetworkConfigState(updated);
      },
      setPublicFallback: async enabled => {
        await networkService.setPublicFallback(enabled);
        const updated = await networkService.getConfig();
        setNetworkConfigState(updated);
      },
    }),
    [isOnline, networkConfig, networkService],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
