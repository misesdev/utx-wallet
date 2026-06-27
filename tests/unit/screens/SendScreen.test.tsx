import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import { fireEvent, act } from '@testing-library/react-native';
import { SendScreen } from '../../../src/presentation/screens/wallet/SendScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { SendBitcoinState } from '../../../src/presentation/hooks/useSendBitcoin';
import type { FeeRates } from '../../../src/core/domain/repositories/BlockchainProvider';

const VALID_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

const FEE_RATES: FeeRates = {
  fastSatsPerVByte: 20,
  halfHourSatsPerVByte: 10,
  hourSatsPerVByte: 5,
  economySatsPerVByte: 2,
  minimumSatsPerVByte: 1,
};

const mockSetToAddress = jest.fn();
const mockSetAmountSats = jest.fn();
const mockSetFeeTier = jest.fn();
const mockSetCustomFeeRate = jest.fn();
const mockClearPreview = jest.fn();
const mockOpenReview = jest.fn();
const mockCloseReview = jest.fn();
const mockReviewTransaction = jest.fn().mockResolvedValue(undefined);
const mockSendTransaction = jest.fn().mockResolvedValue(undefined);
const mockResetSend = jest.fn();
const mockSetPayFee = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();

let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const BASE_STATE: SendBitcoinState = {
  toAddress: '',
  amountSats: '',
  feeTier: 'normal',
  customFeeRate: '',
  customFeeError: null,
  availableBalanceSats: 1_000_000,
  feeRates: FEE_RATES,
  isLoadingFeeRates: false,
  addressError: null,
  amountError: null,
  preview: null,
  isPreviewing: false,
  previewError: null,
  selectedFeeRate: 10,
  isReviewVisible: false,
  isSending: false,
  sendError: null,
  sentResult: null,
  isWatchOnly: false,
  payFee: false,
  setPayFee: mockSetPayFee,
  setToAddress: mockSetToAddress,
  setAmountSats: mockSetAmountSats,
  setFeeTier: mockSetFeeTier,
  setCustomFeeRate: mockSetCustomFeeRate,
  reviewTransaction: mockReviewTransaction,
  clearPreview: mockClearPreview,
  openReview: mockOpenReview,
  closeReview: mockCloseReview,
  sendTransaction: mockSendTransaction,
  resetSend: mockResetSend,
};

let mockState: SendBitcoinState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useSendBitcoin', () => ({
  useSendBitcoin: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('SendScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
    mockRouteParams = {};
  });

  describe('balance display', () => {
    it('renders the available balance', () => {
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('available-balance')).toBeTruthy();
      expect(screen.getByText('1,000,000 common.sats')).toBeTruthy();
    });
  });

  describe('origin name badge', () => {
    it('shows generic "send.accountSelected" badge when originId but no originName', () => {
      mockRouteParams = { originId: 'origin-1' };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByText('send.accountSelected')).toBeTruthy();
    });

    it('shows the actual origin name when originName is provided via route params', () => {
      mockRouteParams = { originId: 'origin-1', originName: 'Poupança' };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByText('Poupança')).toBeTruthy();
    });

    it('does not show origin badge when no originId', () => {
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.queryByText('send.accountSelected')).toBeNull();
    });
  });

  describe('form inputs', () => {
    it('renders address input', () => {
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('input-address')).toBeTruthy();
    });

    it('calls setToAddress when address input changes', () => {
      const screen = renderWithTheme(<SendScreen />);
      fireEvent.changeText(screen.getByTestId('input-address'), VALID_ADDRESS);
      expect(mockSetToAddress).toHaveBeenCalledWith(VALID_ADDRESS);
    });

    it('renders amount input', () => {
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('input-amount')).toBeTruthy();
    });

    it('calls setAmountSats when amount input changes', () => {
      const screen = renderWithTheme(<SendScreen />);
      fireEvent.changeText(screen.getByTestId('input-amount'), '100000');
      expect(mockSetAmountSats).toHaveBeenCalledWith('100000');
    });

    it('shows BTC conversion when amount is entered', () => {
      mockState = { ...BASE_STATE, amountSats: '100000' };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('btc-conversion')).toBeTruthy();
    });
  });

  describe('address validation display', () => {
    it('shows address error when addressError is set', () => {
      mockState = { ...BASE_STATE, toAddress: 'bad', addressError: 'Endereço Bitcoin inválido' };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('address-error')).toBeTruthy();
      expect(screen.getByText('Endereço Bitcoin inválido')).toBeTruthy();
    });

    it('does not show address error when null', () => {
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.queryByTestId('address-error')).toBeNull();
    });
  });

  describe('QR scan', () => {
    it('navigates to ScanAddressQr when QR button is pressed', () => {
      const screen = renderWithTheme(<SendScreen />);
      fireEvent.press(screen.getByTestId('btn-qr-scan'));
      expect(mockNavigate).toHaveBeenCalledWith('ScanAddressQr');
    });

    it('sets address when bitcoinAddressScanned event is received', async () => {
      renderWithTheme(<SendScreen />);
      await act(async () => {
        DeviceEventEmitter.emit('bitcoinAddressScanned', 'bc1qtest456');
      });
      expect(mockSetToAddress).toHaveBeenCalledWith('bc1qtest456');
    });

    it('trims whitespace from scanned address', async () => {
      renderWithTheme(<SendScreen />);
      await act(async () => {
        DeviceEventEmitter.emit('bitcoinAddressScanned', '  bc1qtest456  ');
      });
      expect(mockSetToAddress).toHaveBeenCalledWith('bc1qtest456');
    });
  });

  describe('Next button', () => {
    it('is disabled when address is empty', () => {
      const screen = renderWithTheme(<SendScreen />);
      const btn = screen.getByTestId('btn-next');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });

    it('is disabled when amount is empty', () => {
      mockState = { ...BASE_STATE, toAddress: VALID_ADDRESS };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('btn-next').props.accessibilityState?.disabled).toBe(true);
    });

    it('is disabled when address has an error', () => {
      mockState = {
        ...BASE_STATE,
        toAddress: 'bad',
        amountSats: '100000',
        addressError: 'Endereço Bitcoin inválido',
      };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('btn-next').props.accessibilityState?.disabled).toBe(true);
    });

    it('is enabled when address is valid and amount is set', () => {
      mockState = { ...BASE_STATE, toAddress: VALID_ADDRESS, amountSats: '100000' };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('btn-next').props.accessibilityState?.disabled).toBeFalsy();
    });

    it('is disabled when amount exceeds available balance', () => {
      mockState = { ...BASE_STATE, toAddress: VALID_ADDRESS, amountSats: '2000000', availableBalanceSats: 1_000_000 };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('btn-next').props.accessibilityState?.disabled).toBe(true);
    });

    it('shows insufficient balance error when amount exceeds balance', () => {
      mockState = { ...BASE_STATE, toAddress: VALID_ADDRESS, amountSats: '2000000', availableBalanceSats: 1_000_000 };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('balance-error')).toBeTruthy();
      expect(screen.getByText('send.errorInsufficientBalance')).toBeTruthy();
    });

    it('does not show balance error when amount equals available balance', () => {
      mockState = { ...BASE_STATE, toAddress: VALID_ADDRESS, amountSats: '1000000', availableBalanceSats: 1_000_000 };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.queryByTestId('balance-error')).toBeNull();
    });

    it('navigates to SendFees when pressed with valid inputs', () => {
      mockState = { ...BASE_STATE, toAddress: VALID_ADDRESS, amountSats: '100000' };
      const screen = renderWithTheme(<SendScreen />);
      fireEvent.press(screen.getByTestId('btn-next'));
      expect(mockNavigate).toHaveBeenCalledWith('SendFees', {
        originId: undefined,
        originName: undefined,
        toAddress: VALID_ADDRESS,
        amountSats: '100000',
      });
    });
  });
});
