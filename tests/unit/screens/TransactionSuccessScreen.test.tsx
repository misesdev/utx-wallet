import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { TransactionSuccessScreen } from '../../../src/presentation/screens/wallet/TransactionSuccessScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

// Global @react-native-clipboard/clipboard mock is set in jest.setup.tsx
// Global @react-navigation/native mock is set in jest.setup.tsx

const TXID = 'abcdef1234567890' + '0'.repeat(48);
const AMOUNT_SATS = 100_000;
const FEE_SATS = 900;

const mockReset = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ reset: mockReset }),
  useRoute: () => ({
    params: {
      txid: 'abcdef1234567890' + '0'.repeat(48),
      amountSats: AMOUNT_SATS,
      feeSats: FEE_SATS,
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
    expect(screen.getByText('Envio realizado!')).toBeTruthy();
  });

  it('renders the success icon', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    expect(screen.getByTestId('success-icon')).toBeTruthy();
  });

  it('displays the amount in sats', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    expect(screen.getByTestId('success-amount').props.children).toBe('100.000 sats');
  });

  it('displays the fee in sats', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    expect(screen.getByTestId('success-fee').props.children).toBe('900 sats');
  });

  it('displays the full txid', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    expect(screen.getByTestId('success-txid').props.children).toBe(TXID);
  });

  it('copies txid to clipboard when copy button is pressed', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    fireEvent.press(screen.getByTestId('btn-copy-txid'));
    expect(Clipboard.setString).toHaveBeenCalledWith(TXID);
  });

  it('navigates to Home when "Ir para início" is pressed', () => {
    const screen = renderWithTheme(<TransactionSuccessScreen />);
    fireEvent.press(screen.getByTestId('btn-go-home'));
    expect(mockReset).toHaveBeenCalledWith(
      expect.objectContaining({
        routes: expect.arrayContaining([expect.objectContaining({ name: 'Home' })]),
      }),
    );
  });
});
