import React from 'react';
import { Share } from 'react-native';
import { waitFor, fireEvent, act } from '@testing-library/react-native';
import { ExportWalletKeyScreen } from '../../../src/presentation/screens/settings/ExportWalletKeyScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { WalletExportFormat } from '../../../src/core/domain/usecases/wallet/ExportWalletKeyUseCase';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const mockGoBack = jest.fn();
const mockExportKey = jest.fn().mockResolvedValue('test-key-value-abc123');
const mockFormat: WalletExportFormat = 'xpub';

const WALLET: Wallet = {
  id: 'w1',
  name: 'Test Wallet',
  network: 'testnet',
  status: 'locked',
  createdAt: '',
};

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { format: mockFormat } }),
}));

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: WALLET,
    exportWalletKey: jest.fn(),
    getExportFormats: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('../../../src/presentation/hooks/useWalletExport', () => ({
  useWalletExport: () => ({
    formats: ['xpub'] as WalletExportFormat[],
    loadingFormats: false,
    formatsError: null,
    exportKey: mockExportKey,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('ExportWalletKeyScreen', () => {
  let shareSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
  });

  afterEach(() => {
    shareSpy.mockRestore();
  });

  it('renders the exported key title', async () => {
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => expect(screen.getByText('walletExport.exportedKey')).toBeTruthy());
  });

  it('shows the format name as subtitle', async () => {
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => expect(screen.getByText('walletExport.formatXpub')).toBeTruthy());
  });

  it('shows security warning card', async () => {
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => expect(screen.getByText('walletExport.warningTitle')).toBeTruthy());
  });

  it('calls exportKey with the format and accountIndex from route params', async () => {
    renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => expect(mockExportKey).toHaveBeenCalledWith('xpub', undefined));
  });

  it('renders QR code after key is loaded', async () => {
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => expect(screen.getByTestId('export-qr')).toBeTruthy());
  });

  it('renders the key value in the key card', async () => {
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => expect(screen.getByTestId('export-key-value')).toBeTruthy());
  });

  it('renders copy button', async () => {
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => expect(screen.getByTestId('btn-copy')).toBeTruthy());
  });

  it('renders share button', async () => {
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => expect(screen.getByTestId('btn-share')).toBeTruthy());
  });

  it('copies key value when copy button is pressed', async () => {
    const Clipboard = require('@react-native-clipboard/clipboard').default;
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => screen.getByTestId('btn-copy'));
    fireEvent.press(screen.getByTestId('btn-copy'));
    expect(Clipboard.setString).toHaveBeenCalledWith('test-key-value-abc123');
  });

  it('clears clipboard after 60 seconds of copying a sensitive key', async () => {
    jest.useFakeTimers();
    const Clipboard = require('@react-native-clipboard/clipboard').default;
    const { act: reactAct } = require('@testing-library/react-native');
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => screen.getByTestId('btn-copy'));
    fireEvent.press(screen.getByTestId('btn-copy'));

    // Before 60 s: clipboard still has the key
    await reactAct(async () => { jest.advanceTimersByTime(59_999); });
    const callsBeforeClear = Clipboard.setString.mock.calls.filter((c: string[]) => c[0] === '');
    expect(callsBeforeClear).toHaveLength(0);

    // After 60 s: clipboard is wiped
    await reactAct(async () => { jest.advanceTimersByTime(1); });
    const callsAfterClear = Clipboard.setString.mock.calls.filter((c: string[]) => c[0] === '');
    expect(callsAfterClear).toHaveLength(1);

    jest.useRealTimers();
  });

  it('calls Share.share when share button is pressed', async () => {
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => screen.getByTestId('btn-share'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-share'));
    });
    expect(shareSpy).toHaveBeenCalledWith({ message: 'test-key-value-abc123' });
  });

  it('shows error message when exportKey fails', async () => {
    mockExportKey.mockRejectedValueOnce(new Error('Key export failed'));
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => expect(screen.getByTestId('export-error')).toBeTruthy());
  });

  it('navigates back when back button is pressed', async () => {
    const screen = renderWithTheme(<ExportWalletKeyScreen />);
    await waitFor(() => screen.getByText('walletExport.exportedKey'));
    const backBtn = screen.getByLabelText('common.back');
    fireEvent.press(backBtn);
    expect(mockGoBack).toHaveBeenCalled();
  });
});
