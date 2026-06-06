import { renderHook, act } from '@testing-library/react-native';
import { useImportWallet } from '../../../src/presentation/hooks/useImportWallet';
import { AppError } from '../../../src/core/application/errors/AppError';

const mockImportWallet = jest.fn();

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({ importWallet: mockImportWallet }),
}));

const VALID_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('useImportWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty fields and testnet4 as default network', () => {
    const { result } = renderHook(() => useImportWallet());
    expect(result.current.walletName).toBe('');
    expect(result.current.seed).toBe('');
    expect(result.current.selectedNetwork).toBe('testnet4');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('updates walletName via setWalletName', () => {
    const { result } = renderHook(() => useImportWallet());
    act(() => result.current.setWalletName('My Wallet'));
    expect(result.current.walletName).toBe('My Wallet');
  });

  it('updates seed via setSeed', () => {
    const { result } = renderHook(() => useImportWallet());
    act(() => result.current.setSeed(VALID_MNEMONIC));
    expect(result.current.seed).toBe(VALID_MNEMONIC);
  });

  it('updates selectedNetwork via setSelectedNetwork', () => {
    const { result } = renderHook(() => useImportWallet());
    act(() => result.current.setSelectedNetwork('mainnet'));
    expect(result.current.selectedNetwork).toBe('mainnet');
    act(() => result.current.setSelectedNetwork('testnet3'));
    expect(result.current.selectedNetwork).toBe('testnet3');
  });

  it('clearError resets error to empty string', () => {
    const { result } = renderHook(() => useImportWallet());
    act(() => { result.current.submit().catch(() => undefined); }); // triggers "name required" error
    act(() => result.current.clearError());
    expect(result.current.error).toBe('');
  });

  describe('submit() — validation', () => {
    it('sets error and returns null when walletName is empty', async () => {
      const { result } = renderHook(() => useImportWallet());
      let returned: unknown;
      await act(async () => { returned = await result.current.submit(); });
      expect(returned).toBeNull();
      expect(result.current.error).toBe('Wallet name is required');
      expect(mockImportWallet).not.toHaveBeenCalled();
    });

    it('sets error and returns null when walletName is only whitespace', async () => {
      const { result } = renderHook(() => useImportWallet());
      act(() => result.current.setWalletName('   '));
      let returned: unknown;
      await act(async () => { returned = await result.current.submit(); });
      expect(returned).toBeNull();
      expect(result.current.error).toBe('Wallet name is required');
    });

    it('sets error when walletName exceeds 48 characters', async () => {
      const { result } = renderHook(() => useImportWallet());
      act(() => result.current.setWalletName('a'.repeat(49)));
      await act(async () => { await result.current.submit(); });
      expect(result.current.error).toBe('Name must be 48 characters or fewer');
      expect(mockImportWallet).not.toHaveBeenCalled();
    });

    it('sets error and returns null when seed is empty', async () => {
      const { result } = renderHook(() => useImportWallet());
      act(() => result.current.setWalletName('My Wallet'));
      let returned: unknown;
      await act(async () => { returned = await result.current.submit(); });
      expect(returned).toBeNull();
      expect(result.current.error).toBe('Seed phrase is required');
      expect(mockImportWallet).not.toHaveBeenCalled();
    });
  });

  describe('submit() — successful import', () => {
    it('calls importWallet with trimmed name, trimmed seed, and selected network', async () => {
      const wallet = { id: '1', name: 'My Wallet', network: 'mainnet', status: 'locked', createdAt: '' };
      mockImportWallet.mockResolvedValue(wallet);
      const { result } = renderHook(() => useImportWallet());
      act(() => {
        result.current.setWalletName('  My Wallet  ');
        result.current.setSeed(`  ${VALID_MNEMONIC}  `);
        result.current.setSelectedNetwork('mainnet');
      });
      let returned: unknown;
      await act(async () => { returned = await result.current.submit(); });
      expect(mockImportWallet).toHaveBeenCalledWith('My Wallet', VALID_MNEMONIC, 'mainnet');
      expect(returned).toEqual(wallet);
      expect(result.current.error).toBe('');
    });

    it('passes testnet3 network to importWallet', async () => {
      mockImportWallet.mockResolvedValue({ id: '2', name: 'W', network: 'testnet3' });
      const { result } = renderHook(() => useImportWallet());
      act(() => {
        result.current.setWalletName('W');
        result.current.setSeed(VALID_MNEMONIC);
        result.current.setSelectedNetwork('testnet3');
      });
      await act(async () => { await result.current.submit(); });
      expect(mockImportWallet).toHaveBeenCalledWith('W', VALID_MNEMONIC, 'testnet3');
    });
  });

  describe('submit() — error handling', () => {
    it('shows invalid seed error on INVALID_SECRET code', async () => {
      mockImportWallet.mockRejectedValue(new AppError('Invalid input', 'INVALID_SECRET'));
      const { result } = renderHook(() => useImportWallet());
      act(() => {
        result.current.setWalletName('My Wallet');
        result.current.setSeed('not a valid bip39 seed at all here');
      });
      await act(async () => { await result.current.submit(); });
      expect(result.current.error).toBe('Invalid seed phrase. Please check your words and try again.');
    });

    it('shows duplicate wallet error on WALLET_EXISTS code', async () => {
      mockImportWallet.mockRejectedValue(new AppError('Already exists', 'WALLET_EXISTS'));
      const { result } = renderHook(() => useImportWallet());
      act(() => {
        result.current.setWalletName('Savings');
        result.current.setSeed(VALID_MNEMONIC);
      });
      await act(async () => { await result.current.submit(); });
      expect(result.current.error).toBe('A wallet named "Savings" already exists.');
    });

    it('shows generic error on unknown AppError code', async () => {
      mockImportWallet.mockRejectedValue(new AppError('Something went wrong', 'UNKNOWN'));
      const { result } = renderHook(() => useImportWallet());
      act(() => {
        result.current.setWalletName('W');
        result.current.setSeed(VALID_MNEMONIC);
      });
      await act(async () => { await result.current.submit(); });
      expect(result.current.error).toBe('Failed to import wallet. Please try again.');
    });

    it('shows generic error on non-AppError exceptions', async () => {
      mockImportWallet.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useImportWallet());
      act(() => {
        result.current.setWalletName('W');
        result.current.setSeed(VALID_MNEMONIC);
      });
      await act(async () => { await result.current.submit(); });
      expect(result.current.error).toBe('Failed to import wallet. Please try again.');
    });

    it('resets isLoading to false after an error', async () => {
      mockImportWallet.mockRejectedValue(new AppError('err', 'INVALID_SECRET'));
      const { result } = renderHook(() => useImportWallet());
      act(() => {
        result.current.setWalletName('W');
        result.current.setSeed(VALID_MNEMONIC);
      });
      await act(async () => { await result.current.submit(); });
      expect(result.current.isLoading).toBe(false);
    });
  });
});
