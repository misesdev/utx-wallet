import React, { createContext, PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react';
import { GenerateMnemonicUseCase } from '../../core/domain/usecases/wallet/GenerateMnemonicUseCase';
import { useWallet } from '../../presentation/hooks/useWallet';

type Step = 'idle' | 'backup' | 'confirming' | 'saving';

type CreateWalletFlowState = {
  step: Step;
  walletName: string;
  words: string[];
  isLoading: boolean;
  error: string | null;
};

export type CreateWalletContextValue = CreateWalletFlowState & {
  initiate(walletName: string): void;
  proceedToConfirm(): void;
  save(): Promise<void>;
  reset(): void;
};

export const CreateWalletContext = createContext<CreateWalletContextValue | null>(null);

const INITIAL: CreateWalletFlowState = {
  step: 'idle',
  walletName: '',
  words: [],
  isLoading: false,
  error: null,
};

const generateMnemonicUseCase = new GenerateMnemonicUseCase();

export function CreateWalletProvider({ children }: PropsWithChildren) {
  const { importWallet } = useWallet();
  const [state, setState] = useState<CreateWalletFlowState>(INITIAL);

  // Keep mnemonic out of plain state so it isn't exposed in DevTools snapshots
  const mnemonicRef = useRef('');

  const initiate = useCallback((walletName: string) => {
    const mnemonic = generateMnemonicUseCase.execute();
    mnemonicRef.current = mnemonic;
    setState({
      step: 'backup',
      walletName,
      words: mnemonic.split(' '),
      isLoading: false,
      error: null,
    });
  }, []);

  const proceedToConfirm = useCallback(() => {
    setState(prev => ({ ...prev, step: 'confirming', error: null }));
  }, []);

  const save = useCallback(async () => {
    const { walletName } = state;
    setState(prev => ({ ...prev, step: 'saving', isLoading: true, error: null }));
    try {
      await importWallet(walletName, mnemonicRef.current);
      mnemonicRef.current = '';
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        step: 'confirming',
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to create wallet. Please try again.',
      }));
    }
  }, [importWallet, state]);

  const reset = useCallback(() => {
    mnemonicRef.current = '';
    setState(INITIAL);
  }, []);

  const value = useMemo<CreateWalletContextValue>(
    () => ({ ...state, initiate, proceedToConfirm, save, reset }),
    [state, initiate, proceedToConfirm, save, reset],
  );

  return (
    <CreateWalletContext.Provider value={value}>{children}</CreateWalletContext.Provider>
  );
}
