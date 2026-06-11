import { renderHook, act } from '@testing-library/react-native';
import { useTemporaryRevealBalance } from '../../../src/presentation/hooks/useTemporaryRevealBalance';

// useSecurity is globally mocked in jest.setup.tsx with hideBalance: false
// We import the mock to override it per-test
import { useSecurity } from '../../../src/app/providers/SecurityProvider';

const mockUseSecurity = useSecurity as jest.MockedFunction<typeof useSecurity>;

function makeSecurityMock(overrides: Partial<ReturnType<typeof useSecurity>> = {}): ReturnType<typeof useSecurity> {
  return {
    settings: {
      pinEnabled: false,
      biometricEnabled: false,
      autoLockSeconds: 300,
      hideBalance: false,
      blockScreenshots: false,
    },
    biometricAvailable: false,
    biometricType: 'none' as const,
    isLoading: false,
    updateSettings: jest.fn().mockResolvedValue(undefined),
    setupPin: jest.fn().mockResolvedValue(undefined),
    validatePin: jest.fn().mockResolvedValue(true),
    removePin: jest.fn().mockResolvedValue(undefined),
    reauthenticate: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('useTemporaryRevealBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSecurity.mockReturnValue(makeSecurityMock());
  });

  describe('when hideBalance is disabled globally', () => {
    it('hidden is false', () => {
      const { result } = renderHook(() => useTemporaryRevealBalance());
      expect(result.current.hidden).toBe(false);
    });

    it('hideBalanceEnabled is false', () => {
      const { result } = renderHook(() => useTemporaryRevealBalance());
      expect(result.current.hideBalanceEnabled).toBe(false);
    });

    it('pinModalVisible is false initially', () => {
      const { result } = renderHook(() => useTemporaryRevealBalance());
      expect(result.current.pinModalVisible).toBe(false);
    });

    it('toggleReveal does not show PIN modal when auth is not needed', async () => {
      const { result } = renderHook(() => useTemporaryRevealBalance());
      await act(async () => {
        await result.current.toggleReveal();
      });
      expect(result.current.pinModalVisible).toBe(false);
      // hidden stays false (feature is off)
      expect(result.current.hidden).toBe(false);
    });
  });

  describe('when hideBalance is enabled globally', () => {
    beforeEach(() => {
      mockUseSecurity.mockReturnValue(
        makeSecurityMock({
          settings: {
            pinEnabled: false,
            biometricEnabled: false,
            autoLockSeconds: 300,
            hideBalance: true,
            blockScreenshots: false,
          },
        }),
      );
    });

    it('hidden starts true', () => {
      const { result } = renderHook(() => useTemporaryRevealBalance());
      expect(result.current.hidden).toBe(true);
    });

    it('hideBalanceEnabled is true', () => {
      const { result } = renderHook(() => useTemporaryRevealBalance());
      expect(result.current.hideBalanceEnabled).toBe(true);
    });

    it('toggleReveal reveals without PIN when no auth method is configured', async () => {
      const { result } = renderHook(() => useTemporaryRevealBalance());
      await act(async () => {
        await result.current.toggleReveal();
      });
      expect(result.current.hidden).toBe(false);
    });

    it('toggleReveal re-hides immediately when already revealed', async () => {
      const { result } = renderHook(() => useTemporaryRevealBalance());

      // reveal first
      await act(async () => {
        await result.current.toggleReveal();
      });
      expect(result.current.hidden).toBe(false);

      // hide again
      await act(async () => {
        await result.current.toggleReveal();
      });
      expect(result.current.hidden).toBe(true);
    });
  });

  describe('when PIN is enabled', () => {
    beforeEach(() => {
      mockUseSecurity.mockReturnValue(
        makeSecurityMock({
          settings: {
            pinEnabled: true,
            biometricEnabled: false,
            autoLockSeconds: 300,
            hideBalance: true,
            blockScreenshots: false,
          },
          reauthenticate: jest.fn().mockResolvedValue(true),
        }),
      );
    });

    it('opens PIN modal when toggleReveal is called while hidden', async () => {
      const { result } = renderHook(() => useTemporaryRevealBalance());

      // Start async toggle but don't await — modal should be visible mid-flow
      act(() => {
        result.current.toggleReveal();
      });

      expect(result.current.pinModalVisible).toBe(true);
    });

    it('reveals after correct PIN is submitted', async () => {
      const mockReauth = jest.fn().mockResolvedValue(true);
      mockUseSecurity.mockReturnValue(
        makeSecurityMock({
          settings: {
            pinEnabled: true,
            biometricEnabled: false,
            autoLockSeconds: 300,
            hideBalance: true,
            blockScreenshots: false,
          },
          reauthenticate: mockReauth,
        }),
      );

      const { result } = renderHook(() => useTemporaryRevealBalance());

      act(() => { result.current.toggleReveal(); });

      await act(async () => {
        await result.current.submitPin('1234');
      });

      expect(result.current.hidden).toBe(false);
      expect(result.current.pinModalVisible).toBe(false);
    });

    it('cancelAuth closes modal and leaves balances hidden', async () => {
      const { result } = renderHook(() => useTemporaryRevealBalance());

      act(() => { result.current.toggleReveal(); });
      expect(result.current.pinModalVisible).toBe(true);

      act(() => { result.current.cancelAuth(); });

      expect(result.current.pinModalVisible).toBe(false);
      expect(result.current.hidden).toBe(true);
    });
  });
});
