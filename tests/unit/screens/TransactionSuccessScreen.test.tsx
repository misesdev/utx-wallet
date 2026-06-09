import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { TransactionSuccessScreen } from '../../../src/presentation/screens/wallet/TransactionSuccessScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

// Global @react-native-clipboard/clipboard mock is set in jest.setup.tsx
// Global @react-navigation/native mock is set in jest.setup.tsx

const TXID = 'abcdef1234567890' + '0'.repeat(48);

const mockReset = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ reset: mockReset }),
  useRoute: () => ({
    params: {
      txid: 'abcdef1234567890' + '0'.repeat(48),
      amountSats: 100_000,
      feeSats: 900,
    },
  }),
}));

describe('TransactionSuccessScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the success heading', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    expect(screen.getByTestId('success-heading')).toBeTruthy();
    expect(screen.getByText('txSuccess.message')).toBeTruthy();
  });

  it('renders the success icon', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    expect(screen.getByTestId('success-icon')).toBeTruthy();
  });

  it('displays the amount in sats', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    expect(screen.getByTestId('success-amount').props.children).toBe('100,000');
  });

  it('displays the fee in sats', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    expect(screen.getByTestId('success-fee').props.children).toBe('900 sats');
  });

  it('displays the truncated txid in the header row', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    // truncated: first 10 + … + last 10
    expect(screen.getByTestId('success-txid').props.children).toBe('abcdef1234…0000000000');
  });

  it('displays the full txid in the detail area', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    expect(screen.getByTestId('success-txid-full').props.children).toBe(TXID);
  });

  it('copies txid to clipboard when copy button is pressed', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    fireEvent.press(screen.getByTestId('btn-copy-txid'));
    expect(Clipboard.setString).toHaveBeenCalledWith(TXID);
  });

  it('shows "Copied!" feedback after pressing copy', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    fireEvent.press(screen.getByTestId('btn-copy-txid'));
    expect(screen.getByText('txSuccess.copied')).toBeTruthy();
  });

  it('resets copied feedback after timeout', async () => {
    jest.useFakeTimers();
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    fireEvent.press(screen.getByTestId('btn-copy-txid'));
    expect(screen.getByText('txSuccess.copied')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(2100); });
    expect(screen.queryByText('txSuccess.copied')).toBeNull();
    expect(screen.getByText('txSuccess.copyTxid')).toBeTruthy();
    jest.useRealTimers();
  });

  it('navigates to WalletList then Home when "Go home" is pressed', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    fireEvent.press(screen.getByTestId('btn-go-home'));
    expect(mockReset).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 1,
        routes: expect.arrayContaining([
          expect.objectContaining({ name: 'WalletList' }),
          expect.objectContaining({ name: 'Home' }),
        ]),
      }),
    );
  });
});
