import { act, renderHook } from '@testing-library/react-native';
import { useSafeMode } from '../../../src/presentation/hooks/useSafeMode';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';
import type { PersonalNode } from '../../../src/core/domain/entities/PersonalNode';

const mockSetNetworkConfig = jest.fn<Promise<void>, [NetworkConfig]>();
let mockNetworkConfig: NetworkConfig = { network: 'testnet4', connectivityMode: 'online', nodeMode: 'public-api' };

const TESTNET_NODE: PersonalNode = {
  id: 'node-1',
  label: 'My Node',
  url: 'node.local',
  network: 'testnet4',
  priority: 1,
};

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({
    networkConfig: mockNetworkConfig,
    isOnline: mockNetworkConfig.connectivityMode === 'online',
    setNetworkConfig: mockSetNetworkConfig,
  }),
}));

describe('useSafeMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkConfig = { network: 'testnet4', connectivityMode: 'online', nodeMode: 'public-api' };
    mockSetNetworkConfig.mockResolvedValue(undefined);
  });

  it('isSafeModeEnabled is false when nodeMode is public-api', () => {
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.isSafeModeEnabled).toBe(false);
  });

  it('isSafeModeEnabled is true when nodeMode is personal-node', () => {
    mockNetworkConfig = { ...mockNetworkConfig, nodeMode: 'personal-node' };
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.isSafeModeEnabled).toBe(true);
  });

  it('activateSafeMode sets nodeMode to personal-node', async () => {
    const { result } = renderHook(() => useSafeMode());
    await act(async () => { await result.current.activateSafeMode(); });
    expect(mockSetNetworkConfig).toHaveBeenCalledWith(
      expect.objectContaining({ nodeMode: 'personal-node' }),
    );
  });

  it('deactivateSafeMode sets nodeMode to public-api', async () => {
    mockNetworkConfig = { ...mockNetworkConfig, nodeMode: 'personal-node' };
    const { result } = renderHook(() => useSafeMode());
    await act(async () => { await result.current.deactivateSafeMode(); });
    expect(mockSetNetworkConfig).toHaveBeenCalledWith(
      expect.objectContaining({ nodeMode: 'public-api' }),
    );
  });

  it('activeNetworkNodeCount reflects nodes matching the active network', () => {
    mockNetworkConfig = {
      ...mockNetworkConfig,
      personalNodes: [TESTNET_NODE, { ...TESTNET_NODE, id: 'node-2', network: 'mainnet' }],
    };
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.activeNetworkNodeCount).toBe(1);
  });

  it('status is connected when safe mode enabled and nodes configured for network', () => {
    mockNetworkConfig = {
      ...mockNetworkConfig,
      nodeMode: 'personal-node',
      personalNodes: [TESTNET_NODE],
    };
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.status).toBe('connected');
    expect(result.current.statusLabel).toBe('conectado');
  });

  it('status is disconnected when safe mode enabled but no nodes for network', () => {
    mockNetworkConfig = {
      ...mockNetworkConfig,
      nodeMode: 'personal-node',
      personalNodes: [],
    };
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.status).toBe('disconnected');
    expect(result.current.statusLabel).toBe('desconectado');
  });

  it('status is disconnected when safe mode is disabled', () => {
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.status).toBe('disconnected');
  });
});
