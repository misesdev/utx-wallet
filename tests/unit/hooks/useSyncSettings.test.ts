import { act, renderHook } from '@testing-library/react-native';
import { useSyncSettings } from '../../../src/presentation/hooks/useSyncSettings';
import { DEFAULT_SYNC_SETTINGS } from '../../../src/core/domain/entities/SyncSettings';
import type { SyncSettings } from '../../../src/core/domain/entities/SyncSettings';
import type { PersonalNode } from '../../../src/core/domain/entities/PersonalNode';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const mockSave = jest.fn<Promise<void>, [SyncSettings]>().mockResolvedValue(undefined);
let mockSettings: SyncSettings = { ...DEFAULT_SYNC_SETTINGS };
let mockNodes: PersonalNode[] = [];
let mockNetworkConfig: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'public-api',
};

jest.mock('../../../src/app/providers/SyncSettingsProvider', () => ({
  useSyncSettingsContext: () => ({
    settings: mockSettings,
    isLoading: false,
    save: mockSave,
  }),
}));

jest.mock('../../../src/presentation/hooks/usePersonalNodes', () => ({
  usePersonalNodes: () => ({ nodes: mockNodes }),
}));

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({ networkConfig: mockNetworkConfig }),
}));

const TESTNET4_NODE: PersonalNode = {
  id: 'n1',
  label: 'Node',
  url: 'http://n.local',
  network: 'testnet4',
  priority: 1,
};

const PERSONAL_NODE_CONFIG: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'personal-node',
};

describe('useSyncSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettings = { ...DEFAULT_SYNC_SETTINGS };
    mockNodes = [];
    mockNetworkConfig = { network: 'testnet4', connectivityMode: 'online', nodeMode: 'public-api' };
  });

  it('returns the current settings', () => {
    const { result } = renderHook(() => useSyncSettings());
    expect(result.current.settings).toEqual(DEFAULT_SYNC_SETTINGS);
  });

  it('hasPersonalNode is false when no nodes exist', () => {
    const { result } = renderHook(() => useSyncSettings());
    expect(result.current.hasPersonalNode).toBe(false);
  });

  it('hasPersonalNode is true when a node is configured', () => {
    mockNodes = [TESTNET4_NODE];
    const { result } = renderHook(() => useSyncSettings());
    expect(result.current.hasPersonalNode).toBe(true);
  });

  describe('canEnableParallelSync', () => {
    it('is false when no nodes are configured', () => {
      const { result } = renderHook(() => useSyncSettings());
      expect(result.current.canEnableParallelSync).toBe(false);
    });

    it('is false when nodes exist but nodeMode is public-api', () => {
      mockNodes = [TESTNET4_NODE];
      mockNetworkConfig = { ...PERSONAL_NODE_CONFIG, nodeMode: 'public-api' };
      const { result } = renderHook(() => useSyncSettings());
      expect(result.current.canEnableParallelSync).toBe(false);
    });

    it('is false when nodeMode is personal-node but node is for a different network', () => {
      mockNodes = [{ ...TESTNET4_NODE, network: 'mainnet' }];
      mockNetworkConfig = PERSONAL_NODE_CONFIG; // active network is testnet4
      const { result } = renderHook(() => useSyncSettings());
      expect(result.current.canEnableParallelSync).toBe(false);
    });

    it('is true when nodeMode is personal-node AND node matches active network', () => {
      mockNodes = [TESTNET4_NODE];
      mockNetworkConfig = PERSONAL_NODE_CONFIG;
      const { result } = renderHook(() => useSyncSettings());
      expect(result.current.canEnableParallelSync).toBe(true);
    });
  });

  describe('setMaxRequestsPerSecond', () => {
    it('calls save with the new RPS value', async () => {
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.setMaxRequestsPerSecond(5);
      });
      expect(mockSave).toHaveBeenCalledWith({ ...DEFAULT_SYNC_SETTINGS, maxRequestsPerSecond: 5 });
    });

    it('clamps value to minimum (1)', async () => {
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.setMaxRequestsPerSecond(0);
      });
      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ maxRequestsPerSecond: 1 }));
    });

    it('clamps value to maximum (20)', async () => {
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.setMaxRequestsPerSecond(99);
      });
      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ maxRequestsPerSecond: 20 }));
    });

    it('rounds fractional values', async () => {
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.setMaxRequestsPerSecond(3.7);
      });
      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ maxRequestsPerSecond: 4 }));
    });
  });

  describe('toggleParallelSync', () => {
    it('does not enable parallel sync when no personal node is configured for active network', async () => {
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.toggleParallelSync();
      });
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('does not enable parallel sync when nodeMode is public-api even with nodes', async () => {
      mockNodes = [TESTNET4_NODE];
      mockNetworkConfig = { ...PERSONAL_NODE_CONFIG, nodeMode: 'public-api' };
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.toggleParallelSync();
      });
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('enables parallel sync when personal node is active for the current network', async () => {
      mockNodes = [TESTNET4_NODE];
      mockNetworkConfig = PERSONAL_NODE_CONFIG;
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.toggleParallelSync();
      });
      expect(mockSave).toHaveBeenCalledWith({ ...DEFAULT_SYNC_SETTINGS, parallelSync: true });
    });

    it('can disable parallel sync even without a personal node for current network', async () => {
      mockSettings = { maxRequestsPerSecond: 1, parallelSync: true };
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.toggleParallelSync();
      });
      expect(mockSave).toHaveBeenCalledWith({ maxRequestsPerSecond: 1, parallelSync: false });
    });
  });
});
