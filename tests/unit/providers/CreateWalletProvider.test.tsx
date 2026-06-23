import React, { useContext } from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { CreateWalletProvider, CreateWalletContext } from '../../../src/app/providers/CreateWalletProvider';

const mockImportWallet = jest.fn().mockResolvedValue({
  id: 'w1', name: 'Test', network: 'testnet', status: 'locked', createdAt: '',
});

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({ importWallet: mockImportWallet }),
}));

jest.mock('../../../src/core/domain/usecases/wallet/GenerateMnemonicUseCase', () => ({
  GenerateMnemonicUseCase: class {
    execute() {
      return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    }
  },
}));

function makeWrapper() {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return <CreateWalletProvider>{children}</CreateWalletProvider>;
  };
}

describe('CreateWalletProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('sensitive data not in React state', () => {
    it('starts with empty words array', () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      expect(result.current?.words).toEqual([]);
    });

    it('starts with empty passphrase', () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      expect(result.current?.passphrase).toBe('');
    });

    it('exposes words via context after initiate()', () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      act(() => result.current?.initiate('My Wallet'));
      expect(result.current?.words).toHaveLength(12);
    });

    it('exposes passphrase via context after initiate() with passphrase', () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      act(() => result.current?.initiate('My Wallet', 'my-bip39-passphrase'));
      expect(result.current?.passphrase).toBe('my-bip39-passphrase');
    });

    it('words are cleared after reset()', () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      act(() => result.current?.initiate('My Wallet'));
      expect(result.current?.words).toHaveLength(12);
      act(() => result.current?.reset());
      expect(result.current?.words).toEqual([]);
    });

    it('passphrase is cleared after reset()', () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      act(() => result.current?.initiate('My Wallet', 'secret-phrase'));
      expect(result.current?.passphrase).toBe('secret-phrase');
      act(() => result.current?.reset());
      expect(result.current?.passphrase).toBe('');
    });

    it('words are cleared after save()', async () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      act(() => result.current?.initiate('My Wallet'));
      expect(result.current?.words).toHaveLength(12);
      await act(async () => { await result.current?.save(); });
      expect(result.current?.words).toEqual([]);
    });

    it('passphrase is cleared after save()', async () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      act(() => result.current?.initiate('My Wallet', 'secret'));
      await act(async () => { await result.current?.save(); });
      expect(result.current?.passphrase).toBe('');
    });

    it('passes passphrase to importWallet on save', async () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      act(() => result.current?.initiate('My Wallet', 'bip39-pass'));
      await act(async () => { await result.current?.save(); });
      expect(mockImportWallet).toHaveBeenCalledWith(
        'My Wallet',
        expect.any(String),
        expect.any(String),
        'bip39-pass',
      );
    });

    it('passes undefined passphrase when none given', async () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      act(() => result.current?.initiate('My Wallet'));
      await act(async () => { await result.current?.save(); });
      expect(mockImportWallet).toHaveBeenCalledWith(
        'My Wallet',
        expect.any(String),
        expect.any(String),
        undefined,
      );
    });
  });

  describe('flow steps', () => {
    it('starts at idle step', () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      expect(result.current?.step).toBe('idle');
    });

    it('moves to backup step after initiate()', () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      act(() => result.current?.initiate('My Wallet'));
      expect(result.current?.step).toBe('backup');
    });

    it('moves to confirming step after proceedToConfirm()', () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      act(() => result.current?.initiate('My Wallet'));
      act(() => result.current?.proceedToConfirm());
      expect(result.current?.step).toBe('confirming');
    });

    it('resets to idle step after reset()', () => {
      const { result } = renderHook(() => useContext(CreateWalletContext), { wrapper: makeWrapper() });
      act(() => result.current?.initiate('My Wallet'));
      act(() => result.current?.reset());
      expect(result.current?.step).toBe('idle');
    });
  });
});
