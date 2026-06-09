import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { AccelerateTransactionScreen } from '../../../src/presentation/screens/wallet/AccelerateTransactionScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { UseAccelerateState } from '../../../src/presentation/hooks/useAccelerateTransaction';
import type { RbfInfo } from '../../../src/core/domain/entities/RbfInfo';

const TXID = 'aaaa' + '00'.repeat(30);
const TO_ADDRESS = 'tb1qrecipient000000000000000000000000000';
const CHANGE_ADDRESS = 'tb1qchange0000000000000000000000000000000';
const NEW_TXID = 'bbbb' + '00'.repeat(30);

const ELIGIBLE_RBF_INFO: RbfInfo = {
  originalTxid: TXID,
  isRbfEligible: true,
  toAddress: TO_ADDRESS,
  recipientAmountSats: 800_000,
  changeAddress: CHANGE_ADDRESS,
  changeAmountSats: 196_000,
  currentFeeSats: 4_000,
  currentFeeRate: 5,
  estimatedVBytes: 180,
  rawInputs: [],
};

const INELIGIBLE_RBF_INFO: RbfInfo = {
  ...ELIGIBLE_RBF_INFO,
  isRbfEligible: false,
  ineligibilityReason: 'no-rbf-signal',
};

const mockSetNewFeeRate = jest.fn();
const mockAccelerate = jest.fn();

const BASE_STATE: UseAccelerateState = {
  rbfInfo: ELIGIBLE_RBF_INFO,
  isLoadingInfo: false,
  infoError: null,
  newFeeRateSatsPerVByte: 6,
  newFeeSats: 1_080,
  newChangeSats: 194_920,
  isAccelerating: false,
  accelerateError: null,
  acceleratedTxid: null,
  setNewFeeRate: mockSetNewFeeRate,
  accelerate: mockAccelerate,
};

let mockState: UseAccelerateState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useAccelerateTransaction', () => ({
  useAccelerateTransaction: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({
    params: {
      txid: 'aaaa' + '00'.repeat(30),
      toAddress: 'tb1qrecipient000000000000000000000000000',
      amountSats: 800_000,
      feeSats: 4_000,
      isConfirmed: false,
    },
  }),
}));

describe('AccelerateTransactionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
    mockAccelerate.mockResolvedValue(undefined);
  });

  describe('loading state', () => {
    it('shows loading indicator when fetching RBF info', () => {
      mockState = { ...BASE_STATE, rbfInfo: null, isLoadingInfo: true };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('rbf-loading')).toBeTruthy();
    });

    it('does not show loading when not loading', () => {
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.queryByTestId('rbf-loading')).toBeNull();
    });
  });

  describe('info error state', () => {
    it('shows info error message when infoError is set', () => {
      mockState = { ...BASE_STATE, rbfInfo: null, isLoadingInfo: false, infoError: 'Network error' };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('rbf-info-error')).toBeTruthy();
    });
  });

  describe('ineligible state', () => {
    it('shows ineligibility banner when not RBF eligible', () => {
      mockState = { ...BASE_STATE, rbfInfo: INELIGIBLE_RBF_INFO };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('rbf-ineligible-banner')).toBeTruthy();
    });

    it('shows the ineligibility reason for no-rbf-signal', () => {
      mockState = { ...BASE_STATE, rbfInfo: INELIGIBLE_RBF_INFO };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('rbf-ineligibility-reason')).toBeTruthy();
    });

    it('shows close button when ineligible', () => {
      mockState = { ...BASE_STATE, rbfInfo: INELIGIBLE_RBF_INFO };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('btn-close-ineligible')).toBeTruthy();
    });

    it('navigates back when close button is pressed on ineligible state', () => {
      mockState = { ...BASE_STATE, rbfInfo: INELIGIBLE_RBF_INFO };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      fireEvent.press(screen.getByTestId('btn-close-ineligible'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not show fee selector when ineligible', () => {
      mockState = { ...BASE_STATE, rbfInfo: INELIGIBLE_RBF_INFO };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.queryByTestId('btn-confirm-accelerate')).toBeNull();
    });
  });

  describe('eligible state', () => {
    it('shows original transaction card', () => {
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('rbf-original-card')).toBeTruthy();
    });

    it('shows the fee preview card', () => {
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('rbf-preview-card')).toBeTruthy();
    });

    it('shows confirm button when eligible', () => {
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('btn-confirm-accelerate')).toBeTruthy();
    });

    it('shows new fee in preview card', () => {
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('rbf-new-fee')).toBeTruthy();
    });

    it('shows fee increase in preview card', () => {
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('rbf-fee-increase')).toBeTruthy();
    });

    it('shows new change in preview card', () => {
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('rbf-new-change')).toBeTruthy();
    });

    it('calls accelerate when confirm button is pressed', async () => {
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      await act(async () => {
        fireEvent.press(screen.getByTestId('btn-confirm-accelerate'));
      });
      expect(mockAccelerate).toHaveBeenCalledTimes(1);
    });

    it('shows accelerate error when accelerateError is set', () => {
      mockState = { ...BASE_STATE, accelerateError: 'Fee too low' };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('rbf-accelerate-error')).toBeTruthy();
    });

    it('shows loading state on confirm button during acceleration', () => {
      mockState = { ...BASE_STATE, isAccelerating: true };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      const btn = screen.getByTestId('btn-confirm-accelerate');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });

    it('increases fee rate when + button is pressed', () => {
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      fireEvent.press(screen.getByTestId('btn-fee-increase'));
      expect(mockSetNewFeeRate).toHaveBeenCalledWith(7); // 6 + 1
    });

    it('decreases fee rate when - button is pressed', () => {
      // currentFeeRate=5, newFeeRate=6, min allowed = currentFeeRate+1 = 6
      // pressing decrease goes to max(6, 6-1) = max(6, 5) = 6
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      fireEvent.press(screen.getByTestId('btn-fee-decrease'));
      expect(mockSetNewFeeRate).toHaveBeenCalledWith(6); // clamped at currentFeeRate+1
    });
  });

  describe('success state', () => {
    it('shows success screen when acceleratedTxid is set', () => {
      mockState = { ...BASE_STATE, acceleratedTxid: NEW_TXID };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('accelerate-success-screen')).toBeTruthy();
    });

    it('shows the new txid in success screen', () => {
      mockState = { ...BASE_STATE, acceleratedTxid: NEW_TXID };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('accelerated-txid')).toBeTruthy();
    });

    it('shows close button on success screen', () => {
      mockState = { ...BASE_STATE, acceleratedTxid: NEW_TXID };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      expect(screen.getByTestId('btn-close-success')).toBeTruthy();
    });

    it('navigates back when close is pressed on success screen', () => {
      mockState = { ...BASE_STATE, acceleratedTxid: NEW_TXID };
      const screen = renderWithTheme(<AccelerateTransactionScreen />);
      fireEvent.press(screen.getByTestId('btn-close-success'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
