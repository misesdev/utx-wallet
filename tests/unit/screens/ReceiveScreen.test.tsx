import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { ReceiveScreen } from '../../../src/presentation/screens/wallet/ReceiveScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { ReceiveBitcoinState } from '../../../src/presentation/hooks/useReceiveBitcoin';

const mockCopyAddress = jest.fn();
const mockShareAddress = jest.fn().mockResolvedValue(undefined);
const mockGenerateNewAddress = jest.fn().mockResolvedValue(undefined);
const mockSetAmountSats = jest.fn();

const DEFAULT_STATE: ReceiveBitcoinState = {
  address: {
    id: 'addr-1',
    accountId: 'wallet-1',
    value: 'tb1qreceiveaddress000',
    network: 'testnet4',
    type: 'p2wpkh',
    isChange: false,
    index: 0,
    isUsed: false,
  },
  hdAddress: null,
  isLoading: false,
  error: null,
  amountSats: '',
  bitcoinUri: 'tb1qreceiveaddress000',
  setAmountSats: mockSetAmountSats,
  copyAddress: mockCopyAddress,
  shareAddress: mockShareAddress,
  generateNewAddress: mockGenerateNewAddress,
};

let mockState: ReceiveBitcoinState = DEFAULT_STATE;

jest.mock('../../../src/presentation/hooks/useReceiveBitcoin', () => ({
  useReceiveBitcoin: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('ReceiveScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...DEFAULT_STATE };
  });

  describe('address display', () => {
    it('renders the receive address', () => {
      const screen = renderWithTheme(<ReceiveScreen />);
      expect(screen.getByTestId('receive-address')).toBeTruthy();
      expect(screen.getByTestId('receive-address').props.children).toBe('tb1qreceiveaddress000');
    });

    it('renders the QR code with the bitcoin uri', () => {
      const screen = renderWithTheme(<ReceiveScreen />);
      const qr = screen.getByTestId('receive-qr');
      expect(qr).toBeTruthy();
    });

    it('renders the QR code value from bitcoinUri', () => {
      mockState = {
        ...DEFAULT_STATE,
        amountSats: '100000',
        bitcoinUri: 'bitcoin:tb1qreceiveaddress000?amount=0.001',
      };
      const screen = renderWithTheme(<ReceiveScreen />);
      expect(screen.getByTestId('qr-value').props.children).toBe(
        'bitcoin:tb1qreceiveaddress000?amount=0.001',
      );
    });
  });

  describe('loading state', () => {
    it('shows loading indicator when no address and isLoading', () => {
      mockState = { ...DEFAULT_STATE, address: null, isLoading: true };
      const screen = renderWithTheme(<ReceiveScreen />);
      expect(screen.queryByTestId('receive-address')).toBeNull();
    });

    it('renders normally when address is available even if isLoading', () => {
      mockState = { ...DEFAULT_STATE, isLoading: true };
      const screen = renderWithTheme(<ReceiveScreen />);
      expect(screen.getByTestId('receive-address')).toBeTruthy();
    });
  });

  describe('error display', () => {
    it('shows error message when error is set', () => {
      mockState = { ...DEFAULT_STATE, address: null, isLoading: false, error: 'Key not found' };
      const screen = renderWithTheme(<ReceiveScreen />);
      expect(screen.getByText('Key not found')).toBeTruthy();
    });
  });

  describe('copy address', () => {
    it('calls copyAddress when Copy button is pressed', () => {
      const screen = renderWithTheme(<ReceiveScreen />);
      fireEvent.press(screen.getByTestId('btn-copy'));
      expect(mockCopyAddress).toHaveBeenCalledTimes(1);
    });
  });

  describe('share address', () => {
    it('calls shareAddress when Share button is pressed', async () => {
      const screen = renderWithTheme(<ReceiveScreen />);
      fireEvent.press(screen.getByTestId('btn-share'));
      await waitFor(() => expect(mockShareAddress).toHaveBeenCalledTimes(1));
    });
  });

  describe('amount input and bitcoin URI', () => {
    it('renders amount input field', () => {
      const screen = renderWithTheme(<ReceiveScreen />);
      expect(screen.getByTestId('input-amount')).toBeTruthy();
    });

    it('calls setAmountSats when user types an amount', () => {
      const screen = renderWithTheme(<ReceiveScreen />);
      fireEvent.changeText(screen.getByTestId('input-amount'), '100000');
      expect(mockSetAmountSats).toHaveBeenCalledWith('100000');
    });

    it('shows bitcoin URI when amountSats is set', () => {
      mockState = {
        ...DEFAULT_STATE,
        amountSats: '100000',
        bitcoinUri: 'bitcoin:tb1qreceiveaddress000?amount=0.001',
      };
      const screen = renderWithTheme(<ReceiveScreen />);
      expect(screen.getByTestId('bitcoin-uri')).toBeTruthy();
      expect(screen.getByTestId('bitcoin-uri').props.children).toBe('bitcoin:tb1qreceiveaddress000?amount=0.001');
    });

    it('hides bitcoin URI element when amountSats is empty', () => {
      const screen = renderWithTheme(<ReceiveScreen />);
      expect(screen.queryByTestId('bitcoin-uri')).toBeNull();
    });
  });

  describe('generate new address', () => {
    it('calls generateNewAddress when button is pressed', async () => {
      const screen = renderWithTheme(<ReceiveScreen />);
      fireEvent.press(screen.getByTestId('btn-new-address'));
      await waitFor(() => expect(mockGenerateNewAddress).toHaveBeenCalledTimes(1));
    });

    it('disables generate button when isLoading', () => {
      mockState = { ...DEFAULT_STATE, isLoading: true };
      const screen = renderWithTheme(<ReceiveScreen />);
      const btn = screen.getByTestId('btn-new-address');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });
  });
});
