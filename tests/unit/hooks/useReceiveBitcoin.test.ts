import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useReceiveBitcoin } from '../../../src/presentation/hooks/useReceiveBitcoin';
import type { Address } from '../../../src/core/domain/entities/Address';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const WALLET: Wallet = {
  id: 'wallet-1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
};

const ADDRESS: Address = {
  id: 'addr-1',
  accountId: 'wallet-1',
  value: 'tb1qreceiveaddress000',
  network: 'testnet4',
  type: 'p2wpkh',
  isChange: false,
  index: 0,
  isUsed: false,
};

const mockGetCurrentReceiveAddress = jest.fn<Promise<Address>, [string]>();
const mockGenerateNewReceiveAddress = jest.fn<Promise<Address>, [string]>();
const mockMarkAddressUsed = jest.fn();

let mockSelectedWallet: Wallet | null = WALLET;

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({ selectedWallet: mockSelectedWallet }),
}));

jest.mock('../../../src/app/providers/AddressProvider', () => ({
  useAddress: () => ({
    getCurrentReceiveAddress: mockGetCurrentReceiveAddress,
    generateNewReceiveAddress: mockGenerateNewReceiveAddress,
    markAddressUsed: mockMarkAddressUsed,
  }),
}));

// Stable object so React's useCallback deps don't change on every render
const mockAddressManagerStable = {
  getReceiveAddress: jest.fn().mockRejectedValue(new Error('HD not initialized')),
  getChangeAddress: jest.fn().mockRejectedValue(new Error('HD not initialized')),
  getOrigins: jest.fn().mockResolvedValue([]),
  createAddressOrigin: jest.fn(),
  ensureAddressPool: jest.fn(),
};

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => mockAddressManagerStable,
}));

describe('useReceiveBitcoin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedWallet = WALLET;
    mockGetCurrentReceiveAddress.mockResolvedValue(ADDRESS);
    mockGenerateNewReceiveAddress.mockResolvedValue({
      ...ADDRESS,
      id: 'addr-2',
      value: 'tb1qreceiveaddress001',
      index: 1,
    });
  });

  describe('address loading', () => {
    it('loads the current receive address on mount', async () => {
      const { result } = renderHook(() => useReceiveBitcoin());

      await waitFor(() => expect(result.current.address).not.toBeNull());

      expect(result.current.address?.value).toBe('tb1qreceiveaddress000');
      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading state while fetching address', async () => {
      let resolve!: (a: Address) => void;
      mockGetCurrentReceiveAddress.mockReturnValue(new Promise(r => (resolve = r)));

      const { result } = renderHook(() => useReceiveBitcoin());

      expect(result.current.isLoading).toBe(true);

      act(() => resolve(ADDRESS));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('sets error when loading fails', async () => {
      mockGetCurrentReceiveAddress.mockRejectedValue(new Error('Key not found'));

      const { result } = renderHook(() => useReceiveBitcoin());

      await waitFor(() => expect(result.current.error).toBe('Key not found'));
      expect(result.current.address).toBeNull();
    });

    it('does not load when no wallet is selected', async () => {
      mockSelectedWallet = null;

      const { result } = renderHook(() => useReceiveBitcoin());

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockGetCurrentReceiveAddress).not.toHaveBeenCalled();
    });
  });

  describe('bitcoin URI generation', () => {
    it('returns plain address as bitcoinUri when no amount', async () => {
      const { result } = renderHook(() => useReceiveBitcoin());
      await waitFor(() => expect(result.current.address).not.toBeNull());

      expect(result.current.bitcoinUri).toBe('tb1qreceiveaddress000');
    });

    it('generates bitcoin: URI with BTC amount when sats are set', async () => {
      const { result } = renderHook(() => useReceiveBitcoin());
      await waitFor(() => expect(result.current.address).not.toBeNull());

      act(() => result.current.setAmountSats('100000'));

      expect(result.current.bitcoinUri).toBe('bitcoin:tb1qreceiveaddress000?amount=0.001');
    });

    it('generates bitcoin: URI for 1 sat correctly', async () => {
      const { result } = renderHook(() => useReceiveBitcoin());
      await waitFor(() => expect(result.current.address).not.toBeNull());

      act(() => result.current.setAmountSats('1'));

      expect(result.current.bitcoinUri).toBe('bitcoin:tb1qreceiveaddress000?amount=0.00000001');
    });

    it('returns plain address when amount is zero', async () => {
      const { result } = renderHook(() => useReceiveBitcoin());
      await waitFor(() => expect(result.current.address).not.toBeNull());

      act(() => result.current.setAmountSats('0'));

      expect(result.current.bitcoinUri).toBe('tb1qreceiveaddress000');
    });

    it('returns plain address when amount is empty string', async () => {
      const { result } = renderHook(() => useReceiveBitcoin());
      await waitFor(() => expect(result.current.address).not.toBeNull());

      act(() => result.current.setAmountSats(''));

      expect(result.current.bitcoinUri).toBe('tb1qreceiveaddress000');
    });
  });

  describe('copy address', () => {
    it('copies address to clipboard', async () => {
      const { result } = renderHook(() => useReceiveBitcoin());
      await waitFor(() => expect(result.current.address).not.toBeNull());

      act(() => result.current.copyAddress());

      expect(Clipboard.setString).toHaveBeenCalledWith('tb1qreceiveaddress000');
    });

    it('does nothing when address is null', () => {
      mockSelectedWallet = null;
      const { result } = renderHook(() => useReceiveBitcoin());

      act(() => result.current.copyAddress());

      expect(Clipboard.setString).not.toHaveBeenCalled();
    });
  });

  describe('share address', () => {
    it('shares the address using Share API', async () => {
      const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
      const { result } = renderHook(() => useReceiveBitcoin());
      await waitFor(() => expect(result.current.address).not.toBeNull());

      await act(async () => { await result.current.shareAddress(); });

      expect(shareSpy).toHaveBeenCalledWith({ message: 'tb1qreceiveaddress000' });
    });

    it('shares bitcoin URI when amount is set', async () => {
      const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
      const { result } = renderHook(() => useReceiveBitcoin());
      await waitFor(() => expect(result.current.address).not.toBeNull());

      act(() => result.current.setAmountSats('50000'));
      await act(async () => { await result.current.shareAddress(); });

      expect(shareSpy).toHaveBeenCalledWith({ message: 'bitcoin:tb1qreceiveaddress000?amount=0.0005' });
    });
  });

  describe('generate new address', () => {
    it('replaces address with newly generated one', async () => {
      const { result } = renderHook(() => useReceiveBitcoin());
      await waitFor(() => expect(result.current.address?.index).toBe(0));

      await act(async () => { await result.current.generateNewAddress(); });

      expect(result.current.address?.value).toBe('tb1qreceiveaddress001');
      expect(result.current.address?.index).toBe(1);
    });

    it('calls generateNewReceiveAddress with the wallet id', async () => {
      const { result } = renderHook(() => useReceiveBitcoin());
      await waitFor(() => expect(result.current.address).not.toBeNull());

      await act(async () => { await result.current.generateNewAddress(); });

      expect(mockGenerateNewReceiveAddress).toHaveBeenCalledWith('wallet-1');
    });

    it('sets error when generation fails', async () => {
      mockGenerateNewReceiveAddress.mockRejectedValue(new Error('Derivation failed'));
      const { result } = renderHook(() => useReceiveBitcoin());
      await waitFor(() => expect(result.current.address).not.toBeNull());

      await act(async () => { await result.current.generateNewAddress(); });

      expect(result.current.error).toBe('Derivation failed');
    });
  });
});
