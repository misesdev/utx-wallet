import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { AccountDetailsScreen } from '../../../src/presentation/screens/wallet/AccountDetailsScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { AccountSummary } from '../../../src/core/domain/services/AccountSummaryService';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRenameAddressOrigin = jest.fn().mockResolvedValue(undefined);
const mockReload = jest.fn().mockResolvedValue(undefined);
const mockListTransactions = jest.fn();

const SUMMARY: AccountSummary = {
  id: 'origin-1',
  walletId: 'wallet-1',
  name: 'Savings',
  type: 'custom',
  accountIndex: 1,
  createdAt: 'now',
  archivedAt: null,
  confirmedBalanceSats: 150_000,
  pendingBalanceSats: 5_000,
  totalBalanceSats: 155_000,
  addressCount: 2,
};

const TXS: Transaction[] = [
  { id: 'tx-1', txid: 'txid-1', amountSats: 50_000, direction: 'incoming', status: 'confirmed', createdAt: '2024-01-01T00:00:00.000Z', originId: 'origin-1', originName: 'Savings' },
  { id: 'tx-2', txid: 'txid-2', amountSats: 25_000, direction: 'incoming', status: 'confirmed', createdAt: '2024-01-02T00:00:00.000Z', originId: 'other', originName: 'Other' },
];

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../../src/presentation/hooks/useAccountSummaries', () => ({
  useAccountSummaries: () => ({ summaries: [SUMMARY], isLoading: false, reload: mockReload }),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({ renameAddressOrigin: mockRenameAddressOrigin }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: { id: 'wallet-1', name: 'Wallet', network: 'testnet4', status: 'locked', createdAt: 'now' },
    listTransactions: mockListTransactions,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { originId: 'origin-1' } }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('AccountDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListTransactions.mockResolvedValue(TXS);
  });

  it('renders account name, balance and only account transactions', async () => {
    const screen = renderWithTheme(<AccountDetailsScreen />);

    expect(screen.getByText('Savings')).toBeTruthy();
    expect(screen.getByTestId('account-balance').props.children).toBe('150,000');
    await waitFor(() => expect(screen.getByTestId('transaction-tx-1')).toBeTruthy());
    expect(screen.queryByTestId('transaction-tx-2')).toBeNull();
  });

  it('renames the account', async () => {
    const screen = renderWithTheme(<AccountDetailsScreen />);

    fireEvent.press(screen.getByTestId('account-rename-button'));
    fireEvent.changeText(screen.getByTestId('account-rename-input'), 'Cold savings');
    fireEvent.press(screen.getByTestId('account-rename-save'));

    await waitFor(() => expect(mockRenameAddressOrigin).toHaveBeenCalledWith('origin-1', 'Cold savings'));
    expect(mockReload).toHaveBeenCalled();
  });
});
