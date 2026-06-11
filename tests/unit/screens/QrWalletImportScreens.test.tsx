import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { HDWallet } from 'bitcoin-tx-lib';
import { AppError } from '../../../src/core/application/errors/AppError';
import { QrWalletScannerScreen } from '../../../src/presentation/screens/qr/QrWalletScannerScreen';
import { ConfirmQrWalletImportScreen } from '../../../src/presentation/screens/qr/ConfirmQrWalletImportScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { stashSensitiveData } from '../../../src/core/infrastructure/adapters/SensitiveDataStore';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigationReset = jest.fn();
const mockImportWallet = jest.fn();
const mockImportSync = jest.fn();

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

let mockRoute: { params?: Record<string, unknown> } = { params: undefined };

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, reset: mockNavigationReset }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({ importWallet: mockImportWallet }),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({
    importSync: mockImportSync,
    getOrigins: jest.fn(),
    createAddressOrigin: jest.fn(),
    renameAddressOrigin: jest.fn(),
    getReceiveAddress: jest.fn(),
    getChangeAddress: jest.fn(),
    ensureAddressPool: jest.fn(),
    listAddresses: jest.fn(),
    discoverWalletAccounts: jest.fn(),
  }),
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
    mockImportSync.mockResolvedValue({ origins: [], newTransactions: 0, newUtxos: 0 });
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

  it('navigates to ImportWallet with seedRef (not raw seed) when a mnemonic is scanned', async () => {
    mockRoute = { params: { network: 'testnet' } };
    const { useCodeScanner } = require('react-native-vision-camera');
    const { popSensitiveData } = require('../../../src/core/infrastructure/adapters/SensitiveDataStore');
    renderWithTheme(<QrWalletScannerScreen />);

    await act(async () => {
      const { __onCodeScanned } = useCodeScanner.mock.results[0].value;
      __onCodeScanned([{ value: MNEMONIC, type: 'qr' }]);
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('ImportWallet', expect.objectContaining({
      network: 'testnet',
    })));

    // The raw seed must NOT be in the nav params — only an opaque ref key
    const callArg = mockNavigate.mock.calls[0][1];
    expect(callArg.seed).toBeUndefined();
    expect(typeof callArg.seedRef).toBe('string');
    // Popping the ref from the store should return the actual mnemonic
    expect(popSensitiveData(callArg.seedRef)).toBe(MNEMONIC);
  });

  it('navigates to ImportWallet with mainnet when mainnet mnemonic-like QR is scanned on mainnet', async () => {
    mockRoute = { params: { network: 'mainnet' } };
    const { useCodeScanner } = require('react-native-vision-camera');
    renderWithTheme(<QrWalletScannerScreen />);

    await act(async () => {
      const { __onCodeScanned } = useCodeScanner.mock.results[0].value;
      __onCodeScanned([{ value: MNEMONIC, type: 'qr' }]);
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('ImportWallet', expect.objectContaining({
      network: 'mainnet',
      seedRef: expect.any(String),
    })));
  });

  it('does NOT navigate to ConfirmQrWalletImport when a mnemonic is scanned', async () => {
    mockRoute = { params: { network: 'testnet' } };
    const { useCodeScanner } = require('react-native-vision-camera');
    renderWithTheme(<QrWalletScannerScreen />);

    await act(async () => {
      const { __onCodeScanned } = useCodeScanner.mock.results[0].value;
      __onCodeScanned([{ value: MNEMONIC, type: 'qr' }]);
    });

    await waitFor(() => expect(mockNavigate).not.toHaveBeenCalledWith('ConfirmQrWalletImport', expect.anything()));
  });

  it('navigates to confirmation when a valid xpub is scanned by camera', async () => {
    mockRoute = { params: { network: 'mainnet' } };
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 44 });
    const { useCodeScanner } = require('react-native-vision-camera');
    renderWithTheme(<QrWalletScannerScreen />);

    await act(async () => {
      const { __onCodeScanned } = useCodeScanner.mock.results[0].value;
      __onCodeScanned([{ value: wallet.getXPub(), type: 'qr' }]);
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('ConfirmQrWalletImport', expect.objectContaining({
      format: 'xpub',
      network: 'mainnet',
      canSign: false,
      isWatchOnly: true,
    })));
  });

  it('navigates to ConfirmQrWalletImport when a valid xpub is scanned (not to ImportWallet)', async () => {
    mockRoute = { params: { network: 'mainnet' } };
    const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 44 });
    const { useCodeScanner } = require('react-native-vision-camera');
    renderWithTheme(<QrWalletScannerScreen />);

    await act(async () => {
      const { __onCodeScanned } = useCodeScanner.mock.results[0].value;
      __onCodeScanned([{ value: wallet.getXPub(), type: 'qr' }]);
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('ConfirmQrWalletImport', expect.anything()));
    expect(mockNavigate).not.toHaveBeenCalledWith('ImportWallet', expect.anything());
  });

  it('imports the confirmed QR wallet and shows progress modal before navigating', async () => {
    const secret = 'tpubD6NzVbkrYhZ4Xexample';
    mockRoute = {
      params: {
        secretRef: stashSensitiveData(secret),
        format: 'watch-only',
        network: 'testnet',
        canSign: false,
        isWatchOnly: true,
      },
    };
    const screen = renderWithTheme(<ConfirmQrWalletImportScreen />);

    fireEvent.changeText(screen.getByTestId('qr-wallet-name-input'), 'Read only');
    fireEvent.press(screen.getByTestId('qr-import-submit'));

    await waitFor(() => expect(mockImportWallet).toHaveBeenCalledWith('Read only', secret, 'testnet'));
    await waitFor(() => expect(mockImportSync).toHaveBeenCalledWith('wallet-1', 'testnet', expect.any(Function)));
    await waitFor(() => expect(screen.getByText('walletSetup.done')).toBeTruthy());

    fireEvent.press(screen.getByTestId('wallet-setup-done-btn'));
    await waitFor(() =>
      expect(mockNavigationReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'WalletList' }] }),
    );
  });

  it('calls importSync with the wallet id and network returned by importWallet', async () => {
    mockImportWallet.mockResolvedValue({
      id: 'wallet-42',
      name: 'My Wallet',
      network: 'mainnet',
      status: 'locked',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    mockRoute = {
      params: {
        secretRef: stashSensitiveData('zpubSomething'),
        format: 'xpub',
        network: 'mainnet',
        canSign: false,
        isWatchOnly: true,
      },
    };
    const screen = renderWithTheme(<ConfirmQrWalletImportScreen />);

    fireEvent.changeText(screen.getByTestId('qr-wallet-name-input'), 'Savings');
    fireEvent.press(screen.getByTestId('qr-import-submit'));

    await waitFor(() =>
      expect(mockImportSync).toHaveBeenCalledWith('wallet-42', 'mainnet', expect.any(Function)),
    );
  });

  it('shows an error on the screen (not in the modal) when importWallet fails with wallet-exists', async () => {
    mockImportWallet.mockRejectedValue(new AppError('wallet already exists', 'WALLET_EXISTS'));
    mockRoute = {
      params: {
        secretRef: stashSensitiveData('zpubSomething'),
        format: 'xpub',
        network: 'testnet',
        canSign: false,
        isWatchOnly: true,
      },
    };
    const screen = renderWithTheme(<ConfirmQrWalletImportScreen />);

    fireEvent.changeText(screen.getByTestId('qr-wallet-name-input'), 'Savings');
    fireEvent.press(screen.getByTestId('qr-import-submit'));

    await waitFor(() =>
      expect(screen.getByText('importWallet.errorWalletExists')).toBeTruthy(),
    );
    expect(mockImportSync).not.toHaveBeenCalled();
  });

  it('does not navigate when importWallet fails', async () => {
    mockImportWallet.mockRejectedValue(new Error('generic error'));
    mockRoute = {
      params: {
        secretRef: stashSensitiveData('zpubSomething'),
        format: 'xpub',
        network: 'testnet',
        canSign: false,
        isWatchOnly: true,
      },
    };
    const screen = renderWithTheme(<ConfirmQrWalletImportScreen />);

    fireEvent.changeText(screen.getByTestId('qr-wallet-name-input'), 'Savings');
    fireEvent.press(screen.getByTestId('qr-import-submit'));

    await waitFor(() => expect(screen.getByText('qrImport.importFailed')).toBeTruthy());
    expect(mockNavigationReset).not.toHaveBeenCalled();
  });

  it('requires a wallet name before importing', () => {
    mockRoute = {
      params: {
        secretRef: stashSensitiveData('secret'),
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
