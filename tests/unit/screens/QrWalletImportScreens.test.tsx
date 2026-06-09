import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { HDWallet } from 'bitcoin-tx-lib';
import { QrWalletScannerScreen } from '../../../src/presentation/screens/qr/QrWalletScannerScreen';
import { ConfirmQrWalletImportScreen } from '../../../src/presentation/screens/qr/ConfirmQrWalletImportScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockImportWallet = jest.fn();

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

let mockRoute: { params?: Record<string, unknown> } = { params: undefined };

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({ importWallet: mockImportWallet }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockRoute,
}));

describe('QrWalletImportScreens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute = { params: undefined };
    mockImportWallet.mockResolvedValue({
      id: 'wallet-1',
      name: 'QR Wallet',
      network: 'testnet',
      status: 'watch-only',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('renders scanner frame and manual entry button', () => {
    mockRoute = { params: { network: 'testnet' } };
    const screen = renderWithTheme(<QrWalletScannerScreen />);

    expect(screen.getByTestId('qr-scanner-frame')).toBeTruthy();
    expect(screen.getByTestId('qr-enter-manually-btn')).toBeTruthy();
  });

  it('opens manual input sheet and validates invalid pasted content', async () => {
    mockRoute = { params: { network: 'testnet' } };
    const screen = renderWithTheme(<QrWalletScannerScreen />);

    fireEvent.press(screen.getByTestId('qr-enter-manually-btn'));
    await screen.findByTestId('qr-manual-input');

    fireEvent.changeText(screen.getByTestId('qr-manual-input'), 'invalid');
    fireEvent.press(screen.getByTestId('qr-manual-submit'));

    expect(screen.getByText('qrImport.invalidFormat')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to confirmation when a valid xpub is scanned by native event', async () => {
    mockRoute = { params: { network: 'mainnet' } };
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 44 });
    renderWithTheme(<QrWalletScannerScreen />);

    DeviceEventEmitter.emit('walletQrScanned', { value: wallet.getXPub() });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('ConfirmQrWalletImport', expect.objectContaining({
      format: 'xpub',
      network: 'mainnet',
      canSign: false,
      isWatchOnly: true,
    })));
  });

  it('imports the confirmed QR wallet after the user defines a name', async () => {
    mockRoute = {
      params: {
        secret: 'tpubD6NzVbkrYhZ4Xexample',
        format: 'watch-only',
        network: 'testnet',
        canSign: false,
        isWatchOnly: true,
      },
    };
    const screen = renderWithTheme(<ConfirmQrWalletImportScreen />);

    fireEvent.changeText(screen.getByTestId('qr-wallet-name-input'), 'Read only');
    fireEvent.press(screen.getByTestId('qr-import-submit'));

    await waitFor(() => expect(mockImportWallet).toHaveBeenCalledWith('Read only', 'tpubD6NzVbkrYhZ4Xexample', 'testnet'));
    expect(mockNavigate).toHaveBeenCalledWith('WalletList');
  });

  it('requires a wallet name before importing', () => {
    mockRoute = {
      params: {
        secret: 'secret',
        format: 'wif',
        network: 'testnet',
        canSign: true,
        isWatchOnly: false,
      },
    };
    const screen = renderWithTheme(<ConfirmQrWalletImportScreen />);

    fireEvent.press(screen.getByTestId('qr-import-submit'));

    expect(screen.getByText('createWallet.errorNameRequired')).toBeTruthy();
    expect(mockImportWallet).not.toHaveBeenCalled();
  });
});
