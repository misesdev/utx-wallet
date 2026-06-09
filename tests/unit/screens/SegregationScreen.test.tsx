import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { SegregationScreen } from '../../../src/presentation/screens/wallet/SegregationScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { AddressOrigin } from '../../../src/core/domain/entities/AddressOrigin';

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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: { id: 'wallet-1', name: 'My Wallet', network: 'mainnet', status: 'locked', createdAt: 'now' },
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
});
