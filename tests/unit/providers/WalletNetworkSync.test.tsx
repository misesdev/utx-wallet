import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { WalletNetworkSync } from '../../../src/app/providers/WalletNetworkSync';

const mockSyncNetworkToWallet = jest.fn().mockResolvedValue(undefined);
let mockSelectedWallet: { id: string; network: string } | null = null;
let mockNetworkConfigNetwork = 'testnet';

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({ selectedWallet: mockSelectedWallet }),
}));

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({
    networkConfig: { network: mockNetworkConfigNetwork },
    syncNetworkToWallet: mockSyncNetworkToWallet,
  }),
}));

describe('WalletNetworkSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedWallet = null;
    mockNetworkConfigNetwork = 'testnet';
  });

  it('does nothing when no wallet is selected', () => {
    render(<WalletNetworkSync />);
    expect(mockSyncNetworkToWallet).not.toHaveBeenCalled();
  });

  it('does not sync when networkConfig already matches wallet network', () => {
    mockSelectedWallet = { id: 'w1', network: 'testnet' };
    mockNetworkConfigNetwork = 'testnet';
    render(<WalletNetworkSync />);
    expect(mockSyncNetworkToWallet).not.toHaveBeenCalled();
  });

  it('syncs network when selected mainnet wallet differs from testnet config', async () => {
    mockSelectedWallet = { id: 'w1', network: 'mainnet' };
    mockNetworkConfigNetwork = 'testnet';
    render(<WalletNetworkSync />);
    await waitFor(() => expect(mockSyncNetworkToWallet).toHaveBeenCalledWith('mainnet'));
  });

  it('syncs to testnet when wallet network is testnet but config is mainnet', async () => {
    mockSelectedWallet = { id: 'w2', network: 'testnet' };
    mockNetworkConfigNetwork = 'mainnet';
    render(<WalletNetworkSync />);
    await waitFor(() => expect(mockSyncNetworkToWallet).toHaveBeenCalledWith('testnet'));
  });

  it('renders null — no visible output', () => {
    mockSelectedWallet = { id: 'w1', network: 'testnet' };
    mockNetworkConfigNetwork = 'testnet';
    const { toJSON } = render(<WalletNetworkSync />);
    expect(toJSON()).toBeNull();
  });
});
