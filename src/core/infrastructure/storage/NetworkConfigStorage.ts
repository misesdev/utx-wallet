import type { NetworkConfig } from '../../domain/entities/Network';
import type { PersonalNode } from '../../domain/entities/PersonalNode';
import type { SecureStorage } from './SecureStorage';
import { DEFAULT_NETWORK } from '../../../shared/constants/networks';

const NETWORK_CONFIG_KEY = 'network_config';

function isValidNetworkConfig(obj: unknown): obj is NetworkConfig {
  if (!obj || typeof obj !== 'object') return false;
  const c = obj as Record<string, unknown>;
  return c.connectivityMode === 'online' || c.connectivityMode === 'offline';
}

function migrateConfig(raw: Record<string, unknown>): NetworkConfig {
  const legacyUrl = raw.personalNodeUrl as string | undefined;
  const legacyPort = raw.personalNodePort as number | undefined;
  const legacyAuthToken = raw.personalNodeAuthToken as string | undefined;
  const legacyNetwork = raw.network as string | undefined;

  let personalNodes = (raw.personalNodes as PersonalNode[] | undefined) ?? [];

  if (personalNodes.length === 0 && legacyUrl?.trim()) {
    const migratedNode: PersonalNode = {
      id: `node_migrated_${Date.now()}`,
      label: 'My Node',
      url: legacyUrl.trim(),
      port: legacyPort,
      authToken: legacyAuthToken,
      network: (legacyNetwork as PersonalNode['network']) ?? DEFAULT_NETWORK,
      priority: 1,
    };
    personalNodes = [migratedNode];
  }

  return {
    connectivityMode: (raw.connectivityMode as NetworkConfig['connectivityMode']) ?? 'online',
    personalNodes,
    allowPublicFallback: typeof raw.allowPublicFallback === 'boolean' ? raw.allowPublicFallback : false,
  };
}

export class NetworkConfigStorage {
  constructor(private readonly secureStorage: SecureStorage) {}

  async load(): Promise<NetworkConfig | null> {
    const value = await this.secureStorage.getItem(NETWORK_CONFIG_KEY);
    if (!value) return null;
    try {
      const parsed: unknown = JSON.parse(value);
      if (!isValidNetworkConfig(parsed)) return null;
      const raw = parsed as Record<string, unknown>;
      const needsMigration =
        'network' in raw || 'nodeMode' in raw || 'personalNodeUrl' in raw;
      const migrated = migrateConfig(raw);
      if (needsMigration) {
        await this.save(migrated);
      }
      return migrated;
    } catch {
      return null;
    }
  }

  async save(config: NetworkConfig): Promise<void> {
    await this.secureStorage.setItem(NETWORK_CONFIG_KEY, JSON.stringify(config));
  }
}
