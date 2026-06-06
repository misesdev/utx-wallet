import { useCallback, useMemo, useState } from 'react';
import type { BitcoinNetwork, NetworkConfig, NodeConnectionStatus } from '../../core/domain/entities/Network';
import { DEFAULT_NETWORK } from '../../shared/constants/networks';
import { useNetwork } from './useNetwork';

export type PersonalNodeForm = {
  url: string;
  port: string;
  authToken: string;
  network: BitcoinNetwork;
};

export type UseSafeModeState = {
  form: PersonalNodeForm;
  isSafeModeEnabled: boolean;
  status: NodeConnectionStatus;
  statusLabel: string;
  setUrl: (value: string) => void;
  setPort: (value: string) => void;
  setAuthToken: (value: string) => void;
  setNetwork: (value: BitcoinNetwork) => void;
  testConnection: () => Promise<NodeConnectionStatus>;
  activateSafeMode: () => Promise<NodeConnectionStatus>;
  deactivateSafeMode: () => Promise<void>;
};

const STATUS_LABELS: Record<NodeConnectionStatus, string> = {
  connected: 'conectado',
  disconnected: 'desconectado',
  'network-incompatible': 'rede incompatível',
  'authentication-error': 'erro de autenticação',
};

function formFromConfig(config: NetworkConfig): PersonalNodeForm {
  return {
    url: config.personalNodeUrl ?? '',
    port: config.personalNodePort ? String(config.personalNodePort) : '',
    authToken: config.personalNodeAuthToken ?? '',
    network: config.network ?? DEFAULT_NETWORK,
  };
}

function buildPersonalNodeConfig(form: PersonalNodeForm): NetworkConfig {
  const port = Number.parseInt(form.port, 10);
  return {
    network: form.network,
    connectivityMode: 'online',
    nodeMode: 'personal-node',
    personalNodeUrl: form.url.trim(),
    personalNodePort: Number.isFinite(port) ? port : undefined,
    personalNodeAuthToken: form.authToken.trim() || undefined,
  };
}

export function useSafeMode(): UseSafeModeState {
  const { networkConfig, setNetworkConfig, testNodeConnection } = useNetwork();
  const [form, setForm] = useState<PersonalNodeForm>(() => formFromConfig(networkConfig));
  const [status, setStatus] = useState<NodeConnectionStatus>('disconnected');

  const isSafeModeEnabled = networkConfig.nodeMode === 'personal-node';

  const updateForm = useCallback((patch: Partial<PersonalNodeForm>) => {
    setForm(current => ({ ...current, ...patch }));
  }, []);

  const testConnection = useCallback(async (): Promise<NodeConnectionStatus> => {
    const result = await testNodeConnection(buildPersonalNodeConfig(form));
    setStatus(result.status);
    return result.status;
  }, [form, testNodeConnection]);

  const activateSafeMode = useCallback(async (): Promise<NodeConnectionStatus> => {
    const config = buildPersonalNodeConfig(form);
    const result = await testNodeConnection(config);
    setStatus(result.status);
    if (result.status === 'connected') {
      await setNetworkConfig(config);
    }
    return result.status;
  }, [form, setNetworkConfig, testNodeConnection]);

  const deactivateSafeMode = useCallback(async (): Promise<void> => {
    await setNetworkConfig({
      network: networkConfig.network,
      connectivityMode: networkConfig.connectivityMode,
      nodeMode: 'public-api',
    });
    setStatus('disconnected');
  }, [networkConfig.connectivityMode, networkConfig.network, setNetworkConfig]);

  return useMemo(() => ({
    form,
    isSafeModeEnabled,
    status,
    statusLabel: STATUS_LABELS[status],
    setUrl: value => updateForm({ url: value }),
    setPort: value => updateForm({ port: value }),
    setAuthToken: value => updateForm({ authToken: value }),
    setNetwork: value => updateForm({ network: value }),
    testConnection,
    activateSafeMode,
    deactivateSafeMode,
  }), [activateSafeMode, deactivateSafeMode, form, isSafeModeEnabled, status, testConnection, updateForm]);
}
