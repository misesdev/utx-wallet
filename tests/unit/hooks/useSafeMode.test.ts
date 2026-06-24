import { act, renderHook } from '@testing-library/react-native';
import { useSafeMode } from '../../../src/presentation/hooks/useSafeMode';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';
import type { PersonalNode } from '../../../src/core/domain/entities/PersonalNode';

const mockSetPublicFallback = jest.fn<Promise<void>, [boolean]>();
let mockNetworkConfig: NetworkConfig = {
  connectivityMode: 'online',
  personalNodes: [],
  allowPublicFallback: false,
};

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
    setPublicFallback: mockSetPublicFallback,
  }),
}));

describe('useSafeMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkConfig = {
      connectivityMode: 'online',
      personalNodes: [],
      allowPublicFallback: false,
    };
    mockSetPublicFallback.mockResolvedValue(undefined);
  });

  it('isSafeModeEnabled is true when allowPublicFallback is false', () => {
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.isSafeModeEnabled).toBe(true);
  });

  it('isSafeModeEnabled is false when allowPublicFallback is true', () => {
    mockNetworkConfig = { ...mockNetworkConfig, allowPublicFallback: true };
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.isSafeModeEnabled).toBe(false);
  });

  it('activateSafeMode calls setPublicFallback(false)', async () => {
    mockNetworkConfig = { ...mockNetworkConfig, allowPublicFallback: true };
    const { result } = renderHook(() => useSafeMode());
    await act(async () => { await result.current.activateSafeMode(); });
    expect(mockSetPublicFallback).toHaveBeenCalledWith(false);
  });

  it('deactivateSafeMode calls setPublicFallback(true)', async () => {
    const { result } = renderHook(() => useSafeMode());
    await act(async () => { await result.current.deactivateSafeMode(); });
    expect(mockSetPublicFallback).toHaveBeenCalledWith(true);
  });

  it('totalNodeCount reflects all configured nodes', () => {
    mockNetworkConfig = {
      ...mockNetworkConfig,
      personalNodes: [TESTNET_NODE, { ...TESTNET_NODE, id: 'node-2', network: 'mainnet' }],
    };
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.totalNodeCount).toBe(2);
  });

  it('status is connected when safe mode enabled (no fallback) and nodes configured', () => {
    mockNetworkConfig = {
      ...mockNetworkConfig,
      allowPublicFallback: false,
      personalNodes: [TESTNET_NODE],
    };
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.status).toBe('connected');
    expect(result.current.statusLabel).toBe('conectado');
  });

  it('status is disconnected when safe mode enabled but no nodes configured', () => {
    mockNetworkConfig = {
      ...mockNetworkConfig,
      allowPublicFallback: false,
      personalNodes: [],
    };
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.status).toBe('disconnected');
    expect(result.current.statusLabel).toBe('desconectado');
  });

  it('status is disconnected when safe mode is disabled (public fallback allowed)', () => {
    mockNetworkConfig = {
      ...mockNetworkConfig,
      allowPublicFallback: true,
      personalNodes: [TESTNET_NODE],
    };
    const { result } = renderHook(() => useSafeMode());
    expect(result.current.status).toBe('disconnected');
  });
});
