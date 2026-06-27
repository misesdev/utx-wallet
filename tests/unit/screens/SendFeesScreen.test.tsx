import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { SendFeesScreen } from '../../../src/presentation/screens/wallet/SendFeesScreen';
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
  recipientAmountSats: 99_100,
  feeSats: 900,
  totalSats: 100_900,
  changeSats: 899_100,
  feeRateSatsPerVByte: 5,
  estimatedVBytes: 180,
  subtractFeeFromAmount: false,
  inputs: [{ address: 'bc1qinput000', valueSats: 1_000_000 }],
  outputs: [
    { address: VALID_ADDRESS, amountSats: 99_100, isChange: false },
    { address: '', amountSats: 899_100, isChange: true },
  ],
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
const mockSetPayFee = jest.fn();
const mockNavigate = jest.fn();
const mockNavigationReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, reset: mockNavigationReset, goBack: jest.fn() }),
  useRoute: () => ({
    params: { toAddress: VALID_ADDRESS, amountSats: '100000', originId: undefined },
  }),
}));

const BASE_STATE: SendBitcoinState = {
  toAddress: VALID_ADDRESS,
  amountSats: '100000',
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
  setPayFee: mockSetPayFee,
};

let mockState: SendBitcoinState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useSendBitcoin', () => ({
  useSendBitcoin: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('SendFeesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
  });

  describe('fee selector', () => {
    it('renders all four fee tiles', () => {
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.getByTestId('fee-tile-economy')).toBeTruthy();
      expect(screen.getByTestId('fee-tile-normal')).toBeTruthy();
      expect(screen.getByTestId('fee-tile-fast')).toBeTruthy();
      expect(screen.getByTestId('fee-tile-custom')).toBeTruthy();
    });

    it('calls setFeeTier when a fee tile is pressed', () => {
      const screen = renderWithTheme(<SendFeesScreen />);
      fireEvent.press(screen.getByTestId('fee-tile-fast'));
      expect(mockSetFeeTier).toHaveBeenCalledWith('fast');
    });

    it('shows custom fee input when custom tier is selected', () => {
      mockState = { ...BASE_STATE, feeTier: 'custom' };
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.getByTestId('input-custom-fee')).toBeTruthy();
    });

    it('hides custom fee input for non-custom tiers', () => {
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.queryByTestId('input-custom-fee')).toBeNull();
    });

    it('shows custom fee error when rate is below minimum', () => {
      mockState = { ...BASE_STATE, feeTier: 'custom', customFeeError: 'fees.customFeeMinError' };
      const screen = renderWithTheme(<SendFeesScreen />);
      // error rendered inside FeeSelector; also review button is disabled
      expect(screen.getByTestId('btn-review').props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('review button', () => {
    it('is disabled when previewing', () => {
      mockState = { ...BASE_STATE, isPreviewing: true };
      const screen = renderWithTheme(<SendFeesScreen />);
      const btn = screen.getByTestId('btn-review');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });

    it('is enabled when address and amount are set and not previewing', () => {
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.getByTestId('btn-review').props.accessibilityState?.disabled).toBeFalsy();
    });

    it('is disabled when customFeeError is set', () => {
      mockState = { ...BASE_STATE, customFeeError: 'fees.customFeeMinError' };
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.getByTestId('btn-review').props.accessibilityState?.disabled).toBe(true);
    });

    it('calls reviewTransaction when pressed', async () => {
      const screen = renderWithTheme(<SendFeesScreen />);
      fireEvent.press(screen.getByTestId('btn-review'));
      await waitFor(() => expect(mockReviewTransaction).toHaveBeenCalledTimes(1));
    });
  });

  describe('navigation to review screen', () => {
    it('navigates to TransactionReview when preview becomes available', async () => {
      mockState = { ...BASE_STATE, preview: PREVIEW, selectedFeeRate: 10 };
      renderWithTheme(<SendFeesScreen />);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          'TransactionReview',
          expect.objectContaining({
            toAddress: VALID_ADDRESS,
            amountSats: '100000',
            selectedFeeRate: 10,
            payFee: false,
            previewJson: JSON.stringify(PREVIEW),
          }),
        );
      });
    });

    it('calls clearPreview after navigating to review screen', async () => {
      mockState = { ...BASE_STATE, preview: PREVIEW, selectedFeeRate: 10 };
      renderWithTheme(<SendFeesScreen />);
      await waitFor(() => expect(mockClearPreview).toHaveBeenCalledTimes(1));
    });
  });

  describe('error states', () => {
    it('shows previewError when set', () => {
      mockState = { ...BASE_STATE, previewError: 'Saldo insuficiente' };
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.getByTestId('preview-error')).toBeTruthy();
      expect(screen.getByText('Saldo insuficiente')).toBeTruthy();
    });
  });

  describe('payFee toggle', () => {
    it('renders the pay fee toggle', () => {
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.getByTestId('toggle-pay-fee')).toBeTruthy();
    });

    it('toggle is off by default', () => {
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.getByTestId('toggle-pay-fee').props.value).toBe(false);
    });

    it('toggle shows on when payFee is true', () => {
      mockState = { ...BASE_STATE, payFee: true };
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.getByTestId('toggle-pay-fee').props.value).toBe(true);
    });

    it('calls setPayFee when toggle is pressed', () => {
      const screen = renderWithTheme(<SendFeesScreen />);
      fireEvent(screen.getByTestId('toggle-pay-fee'), 'valueChange', true);
      expect(mockSetPayFee).toHaveBeenCalledWith(true);
    });
  });

  describe('watch-only wallet guard', () => {
    it('shows watch-only banner when isWatchOnly is true', () => {
      mockState = { ...BASE_STATE, isWatchOnly: true };
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.getByText('send.errorWatchOnly')).toBeTruthy();
    });

    it('does not show fee selector for watch-only wallets', () => {
      mockState = { ...BASE_STATE, isWatchOnly: true };
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.queryByTestId('fee-tile-normal')).toBeNull();
    });

    it('does not show review button for watch-only wallets', () => {
      mockState = { ...BASE_STATE, isWatchOnly: true };
      const screen = renderWithTheme(<SendFeesScreen />);
      expect(screen.queryByTestId('btn-review')).toBeNull();
    });
  });
});
