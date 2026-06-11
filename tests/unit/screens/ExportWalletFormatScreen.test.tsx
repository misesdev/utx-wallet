import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { ExportWalletFormatScreen } from '../../../src/presentation/screens/settings/ExportWalletFormatScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AppRoutes } from '../../../src/app/navigation/routes';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';
import type { WalletExportFormat } from '../../../src/core/domain/usecases/wallet/ExportWalletKeyUseCase';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRequireAuth = jest.fn().mockResolvedValue(true);
const mockGetExportFormats = jest.fn().mockResolvedValue(['mnemonic', 'xpriv', 'xpub'] as WalletExportFormat[]);

const WALLET: Wallet = {
  id: 'w1',
  name: 'Test Wallet',
  network: 'testnet',
  status: 'locked',
  createdAt: '',
};

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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('ExportWalletFormatScreen', () => {
  beforeEach(() => jest.clearAllMocks());

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

  it('requires auth before navigating to export key screen', async () => {
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
});
