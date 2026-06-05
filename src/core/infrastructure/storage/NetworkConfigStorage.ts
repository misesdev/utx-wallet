import type { NetworkConfig } from '../../domain/entities/Network';
import type { SecureStorage } from './SecureStorage';
import { SUPPORTED_NETWORKS } from '../../../shared/constants/networks';

const NETWORK_CONFIG_KEY = 'network_config';

function isValidNetworkConfig(obj: unknown): obj is NetworkConfig {
  if (!obj || typeof obj !== 'object') return false;
  const c = obj as Record<string, unknown>;
  return (
    (SUPPORTED_NETWORKS as string[]).includes(c.network as string) &&
    (c.connectivityMode === 'online' || c.connectivityMode === 'offline') &&
    (c.nodeMode === 'public-api' || c.nodeMode === 'personal-node')
  );
}

export class NetworkConfigStorage {
  constructor(private readonly secureStorage: SecureStorage) {}

  async load(): Promise<NetworkConfig | null> {
    const value = await this.secureStorage.getItem(NETWORK_CONFIG_KEY);
    if (!value) return null;
    try {
      const parsed: unknown = JSON.parse(value);
      return isValidNetworkConfig(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async save(config: NetworkConfig): Promise<void> {
    await this.secureStorage.setItem(NETWORK_CONFIG_KEY, JSON.stringify(config));
  }
}
