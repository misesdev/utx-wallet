import { act, renderHook } from '@testing-library/react-native';
import { useSafeMode } from '../../../src/presentation/hooks/useSafeMode';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const mockSetNetworkConfig = jest.fn<Promise<void>, [NetworkConfig]>();
const mockTestNodeConnection = jest.fn();
let mockNetworkConfig: NetworkConfig = { network: 'testnet4', connectivityMode: 'online', nodeMode: 'public-api' };

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({
    networkConfig: mockNetworkConfig,
    isOnline: mockNetworkConfig.connectivityMode === 'online',
    setNetworkConfig: mockSetNetworkConfig,
    testNodeConnection: mockTestNodeConnection,
  }),
}));

describe('useSafeMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkConfig = { network: 'testnet4', connectivityMode: 'online', nodeMode: 'public-api' };
    mockSetNetworkConfig.mockResolvedValue(undefined);
    mockTestNodeConnection.mockResolvedValue({ status: 'connected', expectedNetwork: 'testnet4', actualNetwork: 'testnet4' });
  });

  it('tests and saves personal node config when activation succeeds', async () => {
    const { result } = renderHook(() => useSafeMode());

    act(() => {
      result.current.setUrl('node.local');
      result.current.setPort('3000');
      result.current.setAuthToken('secret');
      result.current.setNetwork('testnet4');
    });

    await act(async () => {
      await result.current.activateSafeMode();
    });

    const expectedConfig: NetworkConfig = {
      network: 'testnet4',
      connectivityMode: 'online',
      nodeMode: 'personal-node',
      personalNodeUrl: 'node.local',
      personalNodePort: 3000,
      personalNodeAuthToken: 'secret',
    };
    expect(mockTestNodeConnection).toHaveBeenCalledWith(expectedConfig);
    expect(mockSetNetworkConfig).toHaveBeenCalledWith(expectedConfig);
    expect(result.current.statusLabel).toBe('conectado');
  });

  it('does not save personal node config when activation test fails', async () => {
    mockTestNodeConnection.mockResolvedValue({ status: 'network-incompatible', expectedNetwork: 'testnet4', actualNetwork: 'mainnet' });
    const { result } = renderHook(() => useSafeMode());

    act(() => {
      result.current.setUrl('node.local');
    });

    await act(async () => {
      await result.current.activateSafeMode();
    });

    expect(mockSetNetworkConfig).not.toHaveBeenCalled();
    expect(result.current.statusLabel).toBe('rede incompatível');
  });

  it('disables safe mode by returning to public API node mode', async () => {
    mockNetworkConfig = {
      network: 'testnet4',
      connectivityMode: 'online',
      nodeMode: 'personal-node',
      personalNodeUrl: 'node.local',
    };
    const { result } = renderHook(() => useSafeMode());

    await act(async () => {
      await result.current.deactivateSafeMode();
    });

    expect(mockSetNetworkConfig).toHaveBeenCalledWith({
      network: 'testnet4',
      connectivityMode: 'online',
      nodeMode: 'public-api',
    });
  });
});
