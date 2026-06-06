import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { SendScreen } from '../../../src/presentation/screens/wallet/SendScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { SendBitcoinState } from '../../../src/presentation/hooks/useSendBitcoin';
import type { TransactionPreview } from '../../../src/core/domain/entities/TransactionPreview';
import type { FeeRates } from '../../../src/core/domain/repositories/BlockchainProvider';

const VALID_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

const FEE_RATES: FeeRates = {
  fastSatsPerVByte: 20,
  halfHourSatsPerVByte: 10,
  hourSatsPerVByte: 5,
  economySatsPerVByte: 2,
  minimumSatsPerVByte: 1,
};

const PREVIEW: TransactionPreview = {
  toAddress: VALID_ADDRESS,
  amountSats: 100_000,
  feeSats: 900,
  totalSats: 100_900,
  changeSats: 899_100,
  feeRateSatsPerVByte: 5,
  estimatedVBytes: 180,
};

const mockReviewTransaction = jest.fn().mockResolvedValue(undefined);
const mockSetToAddress = jest.fn();
const mockSetAmountSats = jest.fn();
const mockSetFeeTier = jest.fn();
const mockSetCustomFeeRate = jest.fn();
const mockClearPreview = jest.fn();
const mockOpenReview = jest.fn();
const mockCloseReview = jest.fn();
const mockSendTransaction = jest.fn().mockResolvedValue(undefined);
const mockResetSend = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, reset: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

const BASE_STATE: SendBitcoinState = {
  toAddress: '',
  amountSats: '',
  feeTier: 'normal',
  customFeeRate: '',
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
  });

  describe('balance display', () => {
    it('renders the available balance', () => {
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('available-balance')).toBeTruthy();
      expect(screen.getByText('1.000.000 sats')).toBeTruthy();
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
      expect(screen.getByText('≈ 0.001 BTC')).toBeTruthy();
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

  describe('fee selector', () => {
    it('renders all four fee tiles', () => {
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('fee-tile-economy')).toBeTruthy();
      expect(screen.getByTestId('fee-tile-normal')).toBeTruthy();
      expect(screen.getByTestId('fee-tile-fast')).toBeTruthy();
      expect(screen.getByTestId('fee-tile-custom')).toBeTruthy();
    });

    it('calls setFeeTier when a fee tile is pressed', () => {
      const screen = renderWithTheme(<SendScreen />);
      fireEvent.press(screen.getByTestId('fee-tile-fast'));
      expect(mockSetFeeTier).toHaveBeenCalledWith('fast');
    });

    it('shows custom fee input when custom tier is selected', () => {
      mockState = { ...BASE_STATE, feeTier: 'custom' };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('input-custom-fee')).toBeTruthy();
    });

    it('hides custom fee input for non-custom tiers', () => {
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.queryByTestId('input-custom-fee')).toBeNull();
    });
  });

  describe('review button', () => {
    it('is disabled when address is empty', () => {
      const screen = renderWithTheme(<SendScreen />);
      const btn = screen.getByTestId('btn-review');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });

    it('is disabled when amount is empty', () => {
      mockState = { ...BASE_STATE, toAddress: VALID_ADDRESS };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('btn-review').props.accessibilityState?.disabled).toBe(true);
    });

    it('is disabled when address has an error', () => {
      mockState = {
        ...BASE_STATE,
        toAddress: 'bad',
        amountSats: '100000',
        addressError: 'Endereço Bitcoin inválido',
      };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('btn-review').props.accessibilityState?.disabled).toBe(true);
    });

    it('is enabled when address is valid and amount is set', () => {
      mockState = { ...BASE_STATE, toAddress: VALID_ADDRESS, amountSats: '100000' };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('btn-review').props.accessibilityState?.disabled).toBeFalsy();
    });

    it('calls reviewTransaction when pressed', async () => {
      mockState = { ...BASE_STATE, toAddress: VALID_ADDRESS, amountSats: '100000' };
      const screen = renderWithTheme(<SendScreen />);
      fireEvent.press(screen.getByTestId('btn-review'));
      await waitFor(() => expect(mockReviewTransaction).toHaveBeenCalledTimes(1));
    });
  });

  describe('preview card', () => {
    it('shows preview card when preview is available', () => {
      mockState = { ...BASE_STATE, preview: PREVIEW };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('preview-card')).toBeTruthy();
    });

    it('hides preview card when preview is null', () => {
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.queryByTestId('preview-card')).toBeNull();
    });

    it('renders amount sent in preview', () => {
      mockState = { ...BASE_STATE, preview: PREVIEW };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('preview-amount').props.children).toBe('100.000 sats');
    });

    it('renders fee in preview', () => {
      mockState = { ...BASE_STATE, preview: PREVIEW };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('preview-fee').props.children).toBe('900 sats');
    });

    it('renders total in preview', () => {
      mockState = { ...BASE_STATE, preview: PREVIEW };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('preview-total').props.children).toBe('100.900 sats');
    });

    it('renders change in preview when changeSats > 0', () => {
      mockState = { ...BASE_STATE, preview: PREVIEW };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('preview-change')).toBeTruthy();
    });

    it('hides change row when changeSats is zero', () => {
      mockState = { ...BASE_STATE, preview: { ...PREVIEW, changeSats: 0 } };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.queryByTestId('preview-change')).toBeNull();
    });
  });

  describe('error states', () => {
    it('shows previewError when set', () => {
      mockState = { ...BASE_STATE, previewError: 'Saldo insuficiente' };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('preview-error')).toBeTruthy();
      expect(screen.getByText('Saldo insuficiente')).toBeTruthy();
    });
  });

  describe('confirm and send button', () => {
    it('shows the confirm button when preview is available', () => {
      mockState = { ...BASE_STATE, preview: PREVIEW };
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.getByTestId('btn-open-review')).toBeTruthy();
    });

    it('hides the confirm button when preview is null', () => {
      const screen = renderWithTheme(<SendScreen />);
      expect(screen.queryByTestId('btn-open-review')).toBeNull();
    });

    it('calls openReview when confirm button is pressed', () => {
      mockState = { ...BASE_STATE, preview: PREVIEW };
      const screen = renderWithTheme(<SendScreen />);
      fireEvent.press(screen.getByTestId('btn-open-review'));
      expect(mockOpenReview).toHaveBeenCalledTimes(1);
    });
  });
});
