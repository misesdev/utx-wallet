import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { TransactionReviewScreen } from '../../../src/presentation/screens/wallet/TransactionReviewScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { ConfirmTransactionState } from '../../../src/presentation/hooks/useConfirmTransaction';
import type { TransactionPreview } from '../../../src/core/domain/entities/TransactionPreview';

const VALID_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

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

const mockRequireAuth = jest.fn().mockResolvedValue(true);
const mockSubmitPin = jest.fn();
const mockCancelAuth = jest.fn();
const mockSendTransaction = jest.fn().mockResolvedValue(undefined);
const mockNavigate = jest.fn();
const mockNavigationReset = jest.fn();

jest.mock('../../../src/presentation/hooks/useReauthenticate', () => ({
  useReauthenticate: () => ({
    requireAuth: mockRequireAuth,
    pinModalVisible: false,
    pinError: null,
    submitPin: mockSubmitPin,
    cancelAuth: mockCancelAuth,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, reset: mockNavigationReset, goBack: jest.fn() }),
  useRoute: () => ({
    params: {
      toAddress: VALID_ADDRESS,
      amountSats: '100000',
      selectedFeeRate: 5,
      payFee: false,
      previewJson: JSON.stringify(PREVIEW),
    },
  }),
}));

const BASE_CONFIRM_STATE: ConfirmTransactionState = {
  isSending: false,
  sendError: null,
  sentResult: null,
  sendTransaction: mockSendTransaction,
};

let mockConfirmState: ConfirmTransactionState = BASE_CONFIRM_STATE;

jest.mock('../../../src/presentation/hooks/useConfirmTransaction', () => ({
  useConfirmTransaction: () => mockConfirmState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('TransactionReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirmState = { ...BASE_CONFIRM_STATE };
    mockRequireAuth.mockResolvedValue(true);
  });

  describe('transaction details', () => {
    it('renders recipient address', () => {
      const screen = renderWithTheme(<TransactionReviewScreen />);
      expect(screen.getByTestId('review-address')).toBeTruthy();
    });

    it('renders requested amount', () => {
      const screen = renderWithTheme(<TransactionReviewScreen />);
      expect(screen.getByTestId('review-amount').props.children).toContain('100,000');
    });

    it('renders recipient receives amount', () => {
      const screen = renderWithTheme(<TransactionReviewScreen />);
      expect(screen.getByTestId('review-recipient-amount').props.children).toContain('99,100');
    });

    it('renders estimated fee', () => {
      const screen = renderWithTheme(<TransactionReviewScreen />);
      expect(screen.getByTestId('review-fee').props.children).toContain('900');
    });

    it('renders total debited', () => {
      const screen = renderWithTheme(<TransactionReviewScreen />);
      expect(screen.getByTestId('review-total').props.children).toContain('100,900');
    });

    it('renders fee rate', () => {
      const screen = renderWithTheme(<TransactionReviewScreen />);
      expect(screen.getByTestId('review-fee-rate').props.children).toContain('5 sat/vB');
    });
  });

  describe('confirm send button', () => {
    it('renders the confirm button', () => {
      const screen = renderWithTheme(<TransactionReviewScreen />);
      expect(screen.getByTestId('btn-confirm-send')).toBeTruthy();
    });

    it('calls requireAuth then sendTransaction when confirm is pressed', async () => {
      const screen = renderWithTheme(<TransactionReviewScreen />);
      fireEvent.press(screen.getByTestId('btn-confirm-send'));
      await waitFor(() => {
        expect(mockRequireAuth).toHaveBeenCalledTimes(1);
        expect(mockSendTransaction).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call sendTransaction when requireAuth returns false', async () => {
      mockRequireAuth.mockResolvedValue(false);
      const screen = renderWithTheme(<TransactionReviewScreen />);
      fireEvent.press(screen.getByTestId('btn-confirm-send'));
      await waitFor(() => expect(mockRequireAuth).toHaveBeenCalledTimes(1));
      expect(mockSendTransaction).not.toHaveBeenCalled();
    });

    it('shows loading state while sending', () => {
      mockConfirmState = { ...BASE_CONFIRM_STATE, isSending: true };
      const screen = renderWithTheme(<TransactionReviewScreen />);
      expect(screen.getByTestId('btn-confirm-send').props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('error states', () => {
    it('shows send error when set', () => {
      mockConfirmState = { ...BASE_CONFIRM_STATE, sendError: 'Broadcast failed' };
      const screen = renderWithTheme(<TransactionReviewScreen />);
      expect(screen.getByTestId('review-send-error')).toBeTruthy();
      expect(screen.getByText('Broadcast failed')).toBeTruthy();
    });
  });

  describe('navigation after success', () => {
    it('resets navigation to TransactionSuccess when sentResult is set', async () => {
      mockConfirmState = {
        ...BASE_CONFIRM_STATE,
        sentResult: {
          txid: 'abc123',
          transaction: { amountSats: 99_100, feeSats: 900 } as any,
        },
      };
      renderWithTheme(<TransactionReviewScreen />);
      await waitFor(() => {
        expect(mockNavigationReset).toHaveBeenCalledWith(
          expect.objectContaining({
            routes: expect.arrayContaining([
              expect.objectContaining({ name: 'TransactionSuccess' }),
            ]),
          }),
        );
      });
    });
  });
});
