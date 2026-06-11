import React from 'react';
import { DeviceEventEmitter, Share } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AppRoutes } from '../../../src/app/navigation/routes';
import { SignatureMenuScreen } from '../../../src/presentation/screens/signature/SignatureMenuScreen';
import { SignContentScreen } from '../../../src/presentation/screens/signature/SignContentScreen';
import { SignatureResultScreen } from '../../../src/presentation/screens/signature/SignatureResultScreen';
import { VerifySignatureScreen } from '../../../src/presentation/screens/signature/VerifySignatureScreen';
import type { SignedMessage } from '../../../src/core/domain/entities/SignedMessage';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ─── Signature context mock ───────────────────────────────────────────────────

const mockSignMessage = jest.fn();
const mockVerifyMessage = jest.fn();
const mockEncodeSignedMessage = jest.fn();
const mockDecodeSignedMessage = jest.fn();

jest.mock('../../../src/app/providers/SignatureProvider', () => ({
  useSignature: () => ({
    signMessage: mockSignMessage,
    verifyMessage: mockVerifyMessage,
    encodeSignedMessage: mockEncodeSignedMessage,
    decodeSignedMessage: mockDecodeSignedMessage,
  }),
}));

// ─── Wallet / network context mocks ──────────────────────────────────────────

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: { id: 'w1', name: 'Test Wallet', network: 'mainnet', status: 'locked', createdAt: '' },
  }),
}));

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({ networkConfig: { network: 'mainnet', connectivityMode: 'online', nodeMode: 'public-api' } }),
}));

// ─── React Navigation route mock ─────────────────────────────────────────────

const mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockRouteParams }),
}));

// ─── Clipboard mock ───────────────────────────────────────────────────────────

const mockSetString = jest.fn();
jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: { setString: (...args: unknown[]) => mockSetString(...args) },
}));

// ─── SAMPLE DATA ─────────────────────────────────────────────────────────────

const SAMPLE_SIGNED: SignedMessage = {
  version: 1,
  pubkey: 'aabbccddeeff0011',
  content: 'hello world',
  sig: '112233445566',
};
const SAMPLE_ENCODED = JSON.stringify({ v: 1, pub: SAMPLE_SIGNED.pubkey, msg: SAMPLE_SIGNED.content, sig: SAMPLE_SIGNED.sig });

// ─── SignatureMenuScreen ──────────────────────────────────────────────────────

describe('SignatureMenuScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the screen title', () => {
    const screen = renderWithTheme(<SignatureMenuScreen />);
    expect(screen.getByText('signature.menuTitle')).toBeTruthy();
  });

  it('renders subtitle', () => {
    const screen = renderWithTheme(<SignatureMenuScreen />);
    expect(screen.getByText('signature.menuSubtitle')).toBeTruthy();
  });

  it('renders sign and verify options', () => {
    const screen = renderWithTheme(<SignatureMenuScreen />);
    expect(screen.getByTestId('btn-sign-content')).toBeTruthy();
    expect(screen.getByTestId('btn-verify-signature')).toBeTruthy();
  });

  it('navigates to SignContent when sign option is pressed', () => {
    const screen = renderWithTheme(<SignatureMenuScreen />);
    fireEvent.press(screen.getByTestId('btn-sign-content'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.SignContent);
  });

  it('navigates to VerifySignature when verify option is pressed', () => {
    const screen = renderWithTheme(<SignatureMenuScreen />);
    fireEvent.press(screen.getByTestId('btn-verify-signature'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.VerifySignature);
  });

  it('navigates back when back button is pressed', () => {
    const screen = renderWithTheme(<SignatureMenuScreen />);
    fireEvent.press(screen.getByLabelText('common.back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

// ─── SignContentScreen ────────────────────────────────────────────────────────

describe('SignContentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignMessage.mockResolvedValue(SAMPLE_SIGNED);
    mockEncodeSignedMessage.mockReturnValue(SAMPLE_ENCODED);
  });

  it('renders the screen title', () => {
    const screen = renderWithTheme(<SignContentScreen />);
    expect(screen.getByText('signature.signTitle')).toBeTruthy();
  });

  it('renders wallet name in header', () => {
    const screen = renderWithTheme(<SignContentScreen />);
    expect(screen.getByText('Test Wallet')).toBeTruthy();
  });

  it('renders content input field', () => {
    const screen = renderWithTheme(<SignContentScreen />);
    expect(screen.getByTestId('input-sign-content')).toBeTruthy();
  });

  it('renders sign button', () => {
    const screen = renderWithTheme(<SignContentScreen />);
    expect(screen.getByTestId('btn-sign-content')).toBeTruthy();
  });

  it('sign button is disabled when content is empty', () => {
    const screen = renderWithTheme(<SignContentScreen />);
    expect(screen.getByTestId('btn-sign-content').props.accessibilityState?.disabled).toBe(true);
  });

  it('calls signMessage and navigates to SignatureResult on success', async () => {
    const screen = renderWithTheme(<SignContentScreen />);
    fireEvent.changeText(screen.getByTestId('input-sign-content'), 'my message');
    fireEvent.press(screen.getByTestId('btn-sign-content'));
    await waitFor(() => {
      expect(mockSignMessage).toHaveBeenCalledWith('w1', 'mainnet', 'my message');
      expect(mockEncodeSignedMessage).toHaveBeenCalledWith(SAMPLE_SIGNED);
      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.SignatureResult, { encoded: SAMPLE_ENCODED });
    });
  });

  it('shows watchOnly error when signer throws WATCH_ONLY_WALLET', async () => {
    mockSignMessage.mockRejectedValue(new Error('WATCH_ONLY_WALLET'));
    const screen = renderWithTheme(<SignContentScreen />);
    fireEvent.changeText(screen.getByTestId('input-sign-content'), 'content');
    fireEvent.press(screen.getByTestId('btn-sign-content'));
    await waitFor(() => {
      expect(screen.getByText('signature.watchOnlyError')).toBeTruthy();
    });
  });

  it('shows generic error when signing fails', async () => {
    mockSignMessage.mockRejectedValue(new Error('Something failed'));
    const screen = renderWithTheme(<SignContentScreen />);
    fireEvent.changeText(screen.getByTestId('input-sign-content'), 'content');
    fireEvent.press(screen.getByTestId('btn-sign-content'));
    await waitFor(() => {
      expect(screen.getByText('signature.errorSignFailed')).toBeTruthy();
    });
  });
});

// ─── SignatureResultScreen ────────────────────────────────────────────────────

describe('SignatureResultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams.encoded = SAMPLE_ENCODED;
    mockDecodeSignedMessage.mockReturnValue(SAMPLE_SIGNED);
  });

  it('renders the screen title', () => {
    const screen = renderWithTheme(<SignatureResultScreen />);
    expect(screen.getByText('signature.resultTitle')).toBeTruthy();
  });

  it('renders signed content', () => {
    const screen = renderWithTheme(<SignatureResultScreen />);
    expect(screen.getByTestId('signature-content')).toBeTruthy();
    expect(screen.getByText('hello world')).toBeTruthy();
  });

  it('renders public key', () => {
    const screen = renderWithTheme(<SignatureResultScreen />);
    expect(screen.getByTestId('signature-pubkey')).toBeTruthy();
    expect(screen.getByText(SAMPLE_SIGNED.pubkey)).toBeTruthy();
  });

  it('renders QR code', () => {
    const screen = renderWithTheme(<SignatureResultScreen />);
    expect(screen.getByTestId('signature-qr')).toBeTruthy();
  });

  it('copies encoded payload to clipboard when copy button is pressed', () => {
    const screen = renderWithTheme(<SignatureResultScreen />);
    fireEvent.press(screen.getByTestId('btn-copy-signature'));
    expect(mockSetString).toHaveBeenCalledWith(SAMPLE_ENCODED);
  });

  it('shares encoded payload when share button is pressed', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    const screen = renderWithTheme(<SignatureResultScreen />);
    fireEvent.press(screen.getByTestId('btn-share-signature'));
    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledWith({ message: SAMPLE_ENCODED });
    });
    shareSpy.mockRestore();
  });
});

// ─── VerifySignatureScreen ────────────────────────────────────────────────────

describe('VerifySignatureScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyMessage.mockReturnValue(true);
    mockDecodeSignedMessage.mockReturnValue(SAMPLE_SIGNED);
  });

  it('renders the screen title', () => {
    const screen = renderWithTheme(<VerifySignatureScreen />);
    expect(screen.getByText('signature.verifyTitle')).toBeTruthy();
  });

  it('renders pubkey, content, and signature input fields', () => {
    const screen = renderWithTheme(<VerifySignatureScreen />);
    expect(screen.getByTestId('input-pubkey')).toBeTruthy();
    expect(screen.getByTestId('input-verify-content')).toBeTruthy();
    expect(screen.getByTestId('input-signature')).toBeTruthy();
  });

  it('renders scan QR and verify buttons', () => {
    const screen = renderWithTheme(<VerifySignatureScreen />);
    expect(screen.getByTestId('btn-scan-signature-qr')).toBeTruthy();
    expect(screen.getByTestId('btn-verify')).toBeTruthy();
  });

  it('shows error when verify is pressed with empty pubkey', () => {
    const screen = renderWithTheme(<VerifySignatureScreen />);
    fireEvent.press(screen.getByTestId('btn-verify'));
    expect(screen.getByText('signature.errorPubkeyRequired')).toBeTruthy();
  });

  it('shows error when verify is pressed with empty content', () => {
    const screen = renderWithTheme(<VerifySignatureScreen />);
    fireEvent.changeText(screen.getByTestId('input-pubkey'), 'pubkey');
    fireEvent.press(screen.getByTestId('btn-verify'));
    expect(screen.getByText('signature.errorContentRequired')).toBeTruthy();
  });

  it('shows error when verify is pressed with empty signature', () => {
    const screen = renderWithTheme(<VerifySignatureScreen />);
    fireEvent.changeText(screen.getByTestId('input-pubkey'), 'pubkey');
    fireEvent.changeText(screen.getByTestId('input-verify-content'), 'content');
    fireEvent.press(screen.getByTestId('btn-verify'));
    expect(screen.getByText('signature.errorSigRequired')).toBeTruthy();
  });

  it('shows valid result banner when signature is valid', () => {
    const screen = renderWithTheme(<VerifySignatureScreen />);
    fireEvent.changeText(screen.getByTestId('input-pubkey'), 'aabbcc');
    fireEvent.changeText(screen.getByTestId('input-verify-content'), 'hello');
    fireEvent.changeText(screen.getByTestId('input-signature'), 'ddeeff');
    fireEvent.press(screen.getByTestId('btn-verify'));
    expect(screen.getByTestId('verify-result-banner')).toBeTruthy();
    expect(screen.getByText('signature.validSignature')).toBeTruthy();
  });

  it('shows invalid result banner when signature is invalid', () => {
    mockVerifyMessage.mockReturnValue(false);
    const screen = renderWithTheme(<VerifySignatureScreen />);
    fireEvent.changeText(screen.getByTestId('input-pubkey'), 'aabbcc');
    fireEvent.changeText(screen.getByTestId('input-verify-content'), 'hello');
    fireEvent.changeText(screen.getByTestId('input-signature'), 'badsig');
    fireEvent.press(screen.getByTestId('btn-verify'));
    expect(screen.getByText('signature.invalidSignature')).toBeTruthy();
  });

  it('shows invalid result banner when verifier throws', () => {
    mockVerifyMessage.mockImplementation(() => { throw new Error('bad hex'); });
    const screen = renderWithTheme(<VerifySignatureScreen />);
    fireEvent.changeText(screen.getByTestId('input-pubkey'), 'xx');
    fireEvent.changeText(screen.getByTestId('input-verify-content'), 'hello');
    fireEvent.changeText(screen.getByTestId('input-signature'), 'yy');
    fireEvent.press(screen.getByTestId('btn-verify'));
    expect(screen.getByText('signature.invalidSignature')).toBeTruthy();
  });

  it('navigates to ScanTextQr with correct event name when scan button is pressed', () => {
    const screen = renderWithTheme(<VerifySignatureScreen />);
    fireEvent.press(screen.getByTestId('btn-scan-signature-qr'));
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.ScanTextQr, { eventName: 'signatureQrScanned' });
  });

  it('fills fields from DeviceEventEmitter when a QR payload is emitted', async () => {
    const screen = renderWithTheme(<VerifySignatureScreen />);
    act(() => {
      DeviceEventEmitter.emit('signatureQrScanned', SAMPLE_ENCODED);
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue(SAMPLE_SIGNED.pubkey)).toBeTruthy();
      expect(screen.getByDisplayValue(SAMPLE_SIGNED.content)).toBeTruthy();
      expect(screen.getByDisplayValue(SAMPLE_SIGNED.sig)).toBeTruthy();
    });
  });
});
