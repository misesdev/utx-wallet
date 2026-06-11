import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { ExportWalletFormatScreen } from '../../../src/presentation/screens/settings/ExportWalletFormatScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AppRoutes } from '../../../src/app/navigation/routes';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';
import type { WalletExportFormat } from '../../../src/core/domain/usecases/wallet/ExportWalletKeyUseCase';
import type { AddressOrigin } from '../../../src/core/domain/entities/AddressOrigin';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRequireAuth = jest.fn().mockResolvedValue(true);
const mockGetExportFormats = jest.fn().mockResolvedValue(['mnemonic', 'xpriv', 'xpub'] as WalletExportFormat[]);
const mockGetOrigins = jest.fn();

const WALLET: Wallet = {
  id: 'w1',
  name: 'Test Wallet',
  network: 'testnet',
  status: 'locked',
  createdAt: '',
};

const ORIGINS: AddressOrigin[] = [
  {
    id: 'o1',
    walletId: 'w1',
    name: 'Default',
    type: 'default',
    accountIndex: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    archivedAt: null,
  },
  {
    id: 'o2',
    walletId: 'w1',
    name: 'Savings',
    type: 'custom',
    accountIndex: 1,
    createdAt: '2024-01-02T00:00:00.000Z',
    archivedAt: null,
  },
];

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: WALLET,
    exportWalletKey: jest.fn(),
    getExportFormats: mockGetExportFormats,
  }),
}));

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../../src/presentation/hooks/useReauthenticate', () => ({
  useReauthenticate: () => ({
    requireAuth: mockRequireAuth,
    pinModalVisible: false,
    pinError: null,
    submitPin: jest.fn(),
    cancelAuth: jest.fn(),
  }),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({
    getOrigins: mockGetOrigins,
    createAddressOrigin: jest.fn(),
    renameAddressOrigin: jest.fn(),
    getReceiveAddress: jest.fn(),
    getChangeAddress: jest.fn(),
    ensureAddressPool: jest.fn(),
    listAddresses: jest.fn(),
    discoverWalletAccounts: jest.fn(),
    importSync: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('ExportWalletFormatScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrigins.mockResolvedValue(ORIGINS);
  });

  it('renders the screen title', async () => {
    const screen = renderWithTheme(<ExportWalletFormatScreen />);
    await waitFor(() => expect(screen.getByText('walletExport.title')).toBeTruthy());
  });

  it('renders wallet name in header', async () => {
    const screen = renderWithTheme(<ExportWalletFormatScreen />);
    await waitFor(() => expect(screen.getByText('Test Wallet')).toBeTruthy());
  });

  it('shows security warning', async () => {
    const screen = renderWithTheme(<ExportWalletFormatScreen />);
    await waitFor(() => expect(screen.getByText('walletExport.warningTitle')).toBeTruthy());
  });

  it('renders available format items after loading', async () => {
    const screen = renderWithTheme(<ExportWalletFormatScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('format-mnemonic')).toBeTruthy();
      expect(screen.getByTestId('format-xpriv')).toBeTruthy();
      expect(screen.getByTestId('format-xpub')).toBeTruthy();
    });
  });

  it('does not render formats that are not available', async () => {
    mockGetExportFormats.mockResolvedValueOnce(['xpub'] as WalletExportFormat[]);
    const screen = renderWithTheme(<ExportWalletFormatScreen />);
    await waitFor(() => expect(screen.getByTestId('format-xpub')).toBeTruthy());
    expect(screen.queryByTestId('format-mnemonic')).toBeNull();
    expect(screen.queryByTestId('format-xpriv')).toBeNull();
    expect(screen.queryByTestId('format-wif')).toBeNull();
  });

  it('navigates back when back button is pressed', async () => {
    const screen = renderWithTheme(<ExportWalletFormatScreen />);
    await waitFor(() => screen.getByText('walletExport.title'));
    const backBtn = screen.getByLabelText('common.back');
    fireEvent.press(backBtn);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('requires auth before navigating to export key screen for mnemonic', async () => {
    const screen = renderWithTheme(<ExportWalletFormatScreen />);
    await waitFor(() => screen.getByTestId('format-mnemonic'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('format-mnemonic'));
    });
    expect(mockRequireAuth).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.ExportWalletKey, { format: 'mnemonic' });
  });

  it('does NOT navigate if auth is denied', async () => {
    mockRequireAuth.mockResolvedValueOnce(false);
    const screen = renderWithTheme(<ExportWalletFormatScreen />);
    await waitFor(() => screen.getByTestId('format-xpriv'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('format-xpriv'));
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders wif format for single-key wallets', async () => {
    mockGetExportFormats.mockResolvedValueOnce(['wif'] as WalletExportFormat[]);
    const screen = renderWithTheme(<ExportWalletFormatScreen />);
    await waitFor(() => expect(screen.getByTestId('format-wif')).toBeTruthy());
  });

  it('shows error card when getExportFormats fails', async () => {
    mockGetExportFormats.mockRejectedValueOnce(new Error('Storage error'));
    const screen = renderWithTheme(<ExportWalletFormatScreen />);
    await waitFor(() => expect(screen.getByText('Storage error')).toBeTruthy());
  });

  describe('zpub account picker', () => {
    it('shows account picker modal when xpub format is tapped (after auth)', async () => {
      const screen = renderWithTheme(<ExportWalletFormatScreen />);
      await waitFor(() => screen.getByTestId('format-xpub'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('format-xpub'));
      });

      await waitFor(() => expect(screen.getByText('walletExport.zpubPickerTitle')).toBeTruthy());
    });

    it('does NOT navigate directly to ExportWalletKey when xpub is tapped', async () => {
      const screen = renderWithTheme(<ExportWalletFormatScreen />);
      await waitFor(() => screen.getByTestId('format-xpub'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('format-xpub'));
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows origin accounts in the picker modal', async () => {
      const screen = renderWithTheme(<ExportWalletFormatScreen />);
      await waitFor(() => screen.getByTestId('format-xpub'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('format-xpub'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('zpub-account-0')).toBeTruthy();
        expect(screen.getByTestId('zpub-account-1')).toBeTruthy();
      });
    });

    it('navigates to ExportWalletKey with format xpub and accountIndex after selecting an account and pressing export', async () => {
      const screen = renderWithTheme(<ExportWalletFormatScreen />);
      await waitFor(() => screen.getByTestId('format-xpub'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('format-xpub'));
      });

      await waitFor(() => screen.getByTestId('zpub-account-0'));
      fireEvent.press(screen.getByTestId('zpub-account-0'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('zpub-export-btn'));
      });

      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.ExportWalletKey, { format: 'xpub', accountIndex: 0 });
    });

    it('export button is disabled when no account is selected', async () => {
      const screen = renderWithTheme(<ExportWalletFormatScreen />);
      await waitFor(() => screen.getByTestId('format-xpub'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('format-xpub'));
      });

      await waitFor(() => screen.getByTestId('zpub-export-btn'));
      expect(screen.getByTestId('zpub-export-btn').props.accessibilityState?.disabled).toBeTruthy();
    });

    it('does not show picker if auth is denied', async () => {
      mockRequireAuth.mockResolvedValueOnce(false);
      const screen = renderWithTheme(<ExportWalletFormatScreen />);
      await waitFor(() => screen.getByTestId('format-xpub'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('format-xpub'));
      });

      expect(screen.queryByText('walletExport.zpubPickerTitle')).toBeNull();
    });
  });
});
