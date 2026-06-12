import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { ViewSeedScreen } from '../../../src/presentation/screens/wallet/ViewSeedScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const mockGoBack = jest.fn();
const mockRequireAuth = jest.fn().mockResolvedValue(true);
const mockSubmitPin = jest.fn();
const mockCancelAuth = jest.fn();
const mockGetWalletSeed = jest.fn().mockResolvedValue({
  mnemonic: 'abandon ability able about above absent absorb abstract absurd abuse access accident',
});

const WALLET: Wallet = {
  id: 'w1',
  name: 'My Wallet',
  network: 'testnet',
  status: 'locked',
  createdAt: '2026-06-08T00:00:00.000Z',
};

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: WALLET,
    getWalletSeed: mockGetWalletSeed,
  }),
}));

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('../../../src/presentation/hooks/useReauthenticate', () => ({
  useReauthenticate: () => ({
    requireAuth: mockRequireAuth,
    pinModalVisible: false,
    pinError: null,
    submitPin: mockSubmitPin,
    cancelAuth: mockCancelAuth,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../src/core/infrastructure/adapters/ScreenCaptureAdapter', () => ({
  NoopScreenCaptureAdapter: jest.fn().mockImplementation(() => ({
    enable: jest.fn(),
    disable: jest.fn(),
  })),
}));

describe('ViewSeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue(true);
    mockGetWalletSeed.mockResolvedValue({
      mnemonic: 'abandon ability able about above absent absorb abstract absurd abuse access accident',
    });
  });

  describe('auth gate', () => {
    it('calls requireAuth on mount', async () => {
      renderWithTheme(<ViewSeedScreen />);
      await waitFor(() => expect(mockRequireAuth).toHaveBeenCalledTimes(1));
    });

    it('navigates back when auth fails', async () => {
      mockRequireAuth.mockResolvedValue(false);
      renderWithTheme(<ViewSeedScreen />);
      await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
    });

    it('does not navigate back when auth succeeds', async () => {
      renderWithTheme(<ViewSeedScreen />);
      await waitFor(() => expect(mockRequireAuth).toHaveBeenCalled());
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('initial state', () => {
    it('renders screen title', () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      expect(screen.getByText('viewSeed.title')).toBeTruthy();
    });

    it('shows wallet name in header', () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      expect(screen.getByText('My Wallet')).toBeTruthy();
    });

    it('shows security warning', () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      expect(screen.getByText('backupSeed.keepPrivate')).toBeTruthy();
    });

    it('shows reveal overlay (seed hidden by default)', () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      expect(screen.getByText('backupSeed.tapReveal')).toBeTruthy();
      expect(screen.queryByTestId('seed-grid')).toBeNull();
    });
  });

  describe('revealing the seed', () => {
    it('calls getWalletSeed when reveal is pressed', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => {
        fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
      });
      expect(mockGetWalletSeed).toHaveBeenCalledWith('w1');
    });

    it('shows the seed grid after reveal', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => {
        fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
      });
      await waitFor(() => expect(screen.getByTestId('seed-grid')).toBeTruthy());
    });

    it('displays all 12 words after reveal', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => {
        fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
      });
      await waitFor(() => {
        expect(screen.getByText('abandon')).toBeTruthy();
        expect(screen.getByText('accident')).toBeTruthy();
      });
    });

    it('shows word indices 1–12 after reveal', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => {
        fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
      });
      await waitFor(() => {
        for (let i = 1; i <= 12; i++) {
          expect(screen.getByText(String(i))).toBeTruthy();
        }
      });
    });
  });

  describe('passphrase', () => {
    it('does not show passphrase badge by default', () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      expect(screen.queryByText('backupSeed.passphraseActive')).toBeNull();
    });

    it('shows passphrase badge when seed has a passphrase', async () => {
      mockGetWalletSeed.mockResolvedValueOnce({
        mnemonic: 'abandon ability able about above absent absorb abstract absurd abuse access accident',
        passphrase: 'my-secret',
      });
      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => {
        fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
      });
      await waitFor(() => expect(screen.getByText('backupSeed.passphraseActive')).toBeTruthy());
    });
  });

  describe('security tips', () => {
    it('shows security tips', () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      expect(screen.getByText('backupSeed.neverShare')).toBeTruthy();
    });
  });

  describe('extended key view (zprv / vprv wallet)', () => {
    const ZPRV = 'zprvAWgYBBk7JR8GjxWYSsmapFJNDtLjBWAy7KFqGXWfXPFSszmNDBVFQFBD5xFJn7hLdFLzBxJRu2Yem4nVXLaFoLNexFNxMJJ5K8HgTbC3P1q';

    beforeEach(() => {
      mockGetWalletSeed.mockResolvedValue({ mnemonic: ZPRV });
    });

    it('shows QR code instead of seed grid after reveal', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => {
        fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
      });
      await waitFor(() => expect(screen.getByTestId('seed-qr')).toBeTruthy());
      expect(screen.queryByTestId('seed-grid')).toBeNull();
    });

    it('shows the key value text after reveal', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => {
        fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
      });
      await waitFor(() => expect(screen.getByTestId('seed-key-value')).toBeTruthy());
    });

    it('shows copy button after reveal', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => {
        fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
      });
      await waitFor(() => expect(screen.getByTestId('btn-copy-key')).toBeTruthy());
    });

    it('shows share button after reveal', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => {
        fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
      });
      await waitFor(() => expect(screen.getByTestId('btn-share-key')).toBeTruthy());
    });

    it('shows extended key title after reveal', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => {
        fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
      });
      await waitFor(() => expect(screen.getByText('viewSeed.titleExtendedKey')).toBeTruthy());
    });

    it('does not show passphrase badge for extended key', async () => {
      mockGetWalletSeed.mockResolvedValue({ mnemonic: ZPRV, passphrase: 'ignored' });
      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => {
        fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
      });
      await waitFor(() => expect(screen.getByTestId('seed-qr')).toBeTruthy());
      expect(screen.queryByText('backupSeed.passphraseActive')).toBeNull();
    });

    it('hides key on app background', async () => {
      const listeners: Array<(s: string) => void> = [];
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_, h) => {
        listeners.push(h as (s: string) => void);
        return { remove: jest.fn() };
      });

      const screen = renderWithTheme(<ViewSeedScreen />);
      await act(async () => { fireEvent.press(screen.getByLabelText('backupSeed.tapReveal')); });
      await waitFor(() => expect(screen.getByTestId('seed-qr')).toBeTruthy());

      await act(async () => { listeners.forEach(l => l('background')); });
      await waitFor(() => expect(screen.queryByTestId('seed-qr')).toBeNull());
    });
  });

  describe('app-switch privacy: seed hidden on background/inactive', () => {
    let appStateListeners: Array<(state: AppStateStatus) => void>;
    let addEventListenerSpy: jest.SpyInstance;

    beforeEach(() => {
      appStateListeners = [];
      addEventListenerSpy = jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((event, handler) => {
          if (event === 'change') {
            appStateListeners.push(handler as (state: AppStateStatus) => void);
          }
          return { remove: jest.fn() };
        });
    });

    afterEach(() => {
      addEventListenerSpy.mockRestore();
    });

    it('hides seed when app goes to background', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);

      await act(async () => { fireEvent.press(screen.getByLabelText('backupSeed.tapReveal')); });
      await waitFor(() => expect(screen.getByTestId('seed-grid')).toBeTruthy());

      await act(async () => { appStateListeners.forEach(l => l('background')); });

      await waitFor(() => expect(screen.queryByTestId('seed-grid')).toBeNull());
      expect(screen.getByText('backupSeed.tapReveal')).toBeTruthy();
    });

    it('hides seed when app becomes inactive (task switcher)', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);

      await act(async () => { fireEvent.press(screen.getByLabelText('backupSeed.tapReveal')); });
      await waitFor(() => expect(screen.getByTestId('seed-grid')).toBeTruthy());

      await act(async () => { appStateListeners.forEach(l => l('inactive')); });

      await waitFor(() => expect(screen.queryByTestId('seed-grid')).toBeNull());
    });

    it('does not hide seed when app returns to active', async () => {
      const screen = renderWithTheme(<ViewSeedScreen />);

      await act(async () => { fireEvent.press(screen.getByLabelText('backupSeed.tapReveal')); });
      await waitFor(() => expect(screen.getByTestId('seed-grid')).toBeTruthy());

      await act(async () => { appStateListeners.forEach(l => l('active')); });

      expect(screen.getByTestId('seed-grid')).toBeTruthy();
    });
  });
});
