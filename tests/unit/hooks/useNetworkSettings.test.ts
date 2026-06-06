import { act, renderHook } from '@testing-library/react-native';
import { useNetworkSettings } from '../../../src/presentation/hooks/useNetworkSettings';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const mockChangeNetwork = jest.fn();
let mockNetworkConfig: NetworkConfig = { network: 'testnet4', connectivityMode: 'online', nodeMode: 'public-api' };
let mockSelectedWallet: Wallet | null = {
  id: 'wallet-1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-06T00:00:00.000Z',
};

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({
    networkConfig: mockNetworkConfig,
    isOnline: mockNetworkConfig.connectivityMode === 'online',
    changeNetwork: mockChangeNetwork,
  }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: mockSelectedWallet,
  }),
}));

describe('useNetworkSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkConfig = { network: 'testnet4', connectivityMode: 'online', nodeMode: 'public-api' };
    mockSelectedWallet = {
      id: 'wallet-1',
      name: 'Primary',
      network: 'testnet4',
      status: 'locked',
      createdAt: '2026-06-06T00:00:00.000Z',
    };
    mockChangeNetwork.mockResolvedValue({ ...mockNetworkConfig, network: 'testnet3' });
  });

  it('switches network through NetworkService provider action', async () => {
    mockSelectedWallet = null;
    const { result } = renderHook(() => useNetworkSettings());

    act(() => {
      result.current.selectNetwork('testnet3');
    });
    await act(async () => {
      await result.current.confirmNetworkChange();
    });

    expect(mockChangeNetwork).toHaveBeenCalledWith('testnet3', undefined);
    expect(result.current.error).toBeNull();
  });

  it('shows a clear warning before applying a different network', () => {
    mockSelectedWallet = null;
    const { result } = renderHook(() => useNetworkSettings());

    act(() => {
      result.current.selectNetwork('testnet3');
    });

    expect(result.current.warning).toContain('Ao trocar de testnet4 para testnet3');
  });

  it('reports incompatible network errors without persisting a local success state', async () => {
    mockChangeNetwork.mockRejectedValue(new AppError('A rede selecionada é incompatível com a carteira atual', 'NETWORK_INCOMPATIBLE'));
    const { result } = renderHook(() => useNetworkSettings());

    act(() => {
      result.current.selectNetwork('mainnet');
    });
    await act(async () => {
      await result.current.confirmNetworkChange();
    });

    expect(mockChangeNetwork).toHaveBeenCalledWith('mainnet', 'testnet4');
    expect(result.current.error).toBe('A rede selecionada é incompatível com a carteira atual');
  });

  it('marks networks incompatible with the selected wallet as unavailable', () => {
    const { result } = renderHook(() => useNetworkSettings());

    expect(result.current.options).toEqual([
      { network: 'mainnet', isActive: false, isWalletCompatible: false },
      { network: 'testnet3', isActive: false, isWalletCompatible: false },
      { network: 'testnet4', isActive: true, isWalletCompatible: true },
    ]);
  });
});
