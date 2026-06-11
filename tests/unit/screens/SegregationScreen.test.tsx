import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { SegregationScreen } from '../../../src/presentation/screens/wallet/SegregationScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { AddressOrigin } from '../../../src/core/domain/entities/AddressOrigin';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetOrigins = jest.fn();
const mockCreateAddressOrigin = jest.fn();
const mockReloadAccountSummaries = jest.fn();

const ORIGIN: AddressOrigin = {
  id: 'origin-1',
  walletId: 'wallet-1',
  name: 'Default',
  type: 'default',
  accountIndex: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  archivedAt: null,
};

const LOCKED_WALLET: Wallet = {
  id: 'wallet-1',
  name: 'My Wallet',
  network: 'mainnet',
  status: 'locked',
  createdAt: 'now',
};

const WATCH_ONLY_WALLET: Wallet = {
  id: 'wallet-2',
  name: 'Watch Wallet',
  network: 'testnet',
  status: 'watch-only',
  createdAt: 'now',
};

let mockSelectedWallet: Wallet = LOCKED_WALLET;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: mockSelectedWallet,
  }),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({
    getOrigins: mockGetOrigins,
    createAddressOrigin: mockCreateAddressOrigin,
  }),
}));

jest.mock('../../../src/presentation/hooks/useAccountSummaries', () => ({
  useAccountSummaries: () => ({
    summaries: [],
    reload: mockReloadAccountSummaries,
  }),
}));

describe('SegregationScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockGetOrigins.mockResolvedValue([ORIGIN]);
    mockCreateAddressOrigin.mockResolvedValue(undefined);
    mockReloadAccountSummaries.mockResolvedValue(undefined);
    mockSelectedWallet = LOCKED_WALLET;
  });

  it('renders the screen title', async () => {
    const { getByText } = renderWithTheme(<SegregationScreen />);
    expect(getByText('segregation.title')).toBeTruthy();
  });

  it('renders the account policy info button', async () => {
    const { getByTestId } = renderWithTheme(<SegregationScreen />);
    expect(getByTestId('btn-account-policy')).toBeTruthy();
  });

  it('navigates to AccountPolicy when the info button is pressed', async () => {
    const { getByTestId } = renderWithTheme(<SegregationScreen />);
    fireEvent.press(getByTestId('btn-account-policy'));
    expect(mockNavigate).toHaveBeenCalledWith('AccountPolicy');
  });

  it('loads and renders origins', async () => {
    const { getByText } = renderWithTheme(<SegregationScreen />);
    await waitFor(() => {
      expect(getByText('Default')).toBeTruthy();
    });
  });

  it('shows the new account button', async () => {
    const { getByText } = renderWithTheme(<SegregationScreen />);
    expect(getByText('segregation.newButton')).toBeTruthy();
  });

  describe('watch-only wallet', () => {
    beforeEach(() => {
      mockSelectedWallet = WATCH_ONLY_WALLET;
    });

    it('shows watch-only notice when wallet is watch-only', async () => {
      const { getByTestId } = renderWithTheme(<SegregationScreen />);
      await waitFor(() => expect(getByTestId('segregation-watch-only-notice')).toBeTruthy());
    });

    it('shows watch-only title text', async () => {
      const { getByText } = renderWithTheme(<SegregationScreen />);
      await waitFor(() => expect(getByText('segregation.watchOnlyTitle')).toBeTruthy());
    });

    it('new account button is disabled for watch-only wallet', async () => {
      const { getByTestId } = renderWithTheme(<SegregationScreen />);
      const btn = getByTestId('segregation-new-btn');
      expect(btn.props.accessibilityState?.disabled).toBeTruthy();
    });

    it('does not show watch-only notice for regular wallet', async () => {
      mockSelectedWallet = LOCKED_WALLET;
      const { queryByTestId } = renderWithTheme(<SegregationScreen />);
      expect(queryByTestId('segregation-watch-only-notice')).toBeNull();
    });
  });
});
