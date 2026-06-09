import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { AddressesScreen } from '../../../src/presentation/screens/wallet/AddressesScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AppRoutes } from '../../../src/app/navigation/routes';

const mockNavigate = jest.fn();
const mockListAddresses = jest.fn();

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({
    listAddresses: mockListAddresses,
    getOrigins: jest.fn(),
    createAddressOrigin: jest.fn(),
    renameAddressOrigin: jest.fn(),
    getReceiveAddress: jest.fn(),
    getChangeAddress: jest.fn(),
    ensureAddressPool: jest.fn(),
    discoverWalletAccounts: jest.fn(),
  }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: { id: 'w1', name: 'Test Wallet', network: 'testnet' },
    syncWallet: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('AddressesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAddresses.mockResolvedValue([]);
  });

  it('renders the screen title', async () => {
    const screen = renderWithTheme(<AddressesScreen />);
    await waitFor(() => expect(screen.getByText('addresses.title')).toBeTruthy());
  });

  it('renders info button', async () => {
    const screen = renderWithTheme(<AddressesScreen />);
    await waitFor(() => expect(screen.getByLabelText('common.info')).toBeTruthy());
  });

  it('navigates to AddressPolicy when info button is pressed', async () => {
    const screen = renderWithTheme(<AddressesScreen />);
    await waitFor(() => expect(screen.getByLabelText('common.info')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('common.info'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.AddressPolicy);
  });

  it('shows empty state when no addresses', async () => {
    mockListAddresses.mockResolvedValue([]);
    const screen = renderWithTheme(<AddressesScreen />);
    await waitFor(() => expect(screen.getByText('addresses.empty')).toBeTruthy());
  });

  it('shows address count in header', async () => {
    mockListAddresses.mockResolvedValue([]);
    const screen = renderWithTheme(<AddressesScreen />);
    await waitFor(() => expect(screen.getByText('addresses.total')).toBeTruthy());
  });
});
