import React, { createContext, PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react';
import type { Wallet } from '../../core/domain/entities/Wallet';
import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import { GenerateMnemonicUseCase } from '../../core/domain/usecases/wallet/GenerateMnemonicUseCase';
import { DEFAULT_NETWORK } from '../../shared/constants/networks';
import { useWallet } from '../../presentation/hooks/useWallet';

type WalletNetwork = BitcoinNetwork;
type Step = 'idle' | 'backup' | 'confirming' | 'saving';

// words and passphrase are intentionally excluded — they live in refs to avoid
// React DevTools exposure of sensitive seed material.
type CreateWalletFlowState = {
  step: Step;
  walletName: string;
  network: WalletNetwork;
  isLoading: boolean;
  error: string | null;
};

export type CreateWalletContextValue = CreateWalletFlowState & {
  words: string[];
  passphrase: string;
  initiate(walletName: string, passphrase?: string, network?: WalletNetwork): void;
  proceedToConfirm(): void;
  save(): Promise<Wallet | null>;
  reset(): void;
};

export const CreateWalletContext = createContext<CreateWalletContextValue | null>(null);

const defaultNetwork: WalletNetwork = DEFAULT_NETWORK;

const INITIAL: CreateWalletFlowState = {
  step: 'idle',
  walletName: '',
  network: defaultNetwork,
  isLoading: false,
  error: null,
};

const generateMnemonicUseCase = new GenerateMnemonicUseCase();

export function CreateWalletProvider({ children }: PropsWithChildren) {
  const { importWallet } = useWallet();
  const [state, setState] = useState<CreateWalletFlowState>(INITIAL);

  // Keep all sensitive seed material in refs — never in React state — so it
  // does not appear in DevTools snapshots or React's internal fiber tree.
  const mnemonicRef = useRef('');
  const wordsRef = useRef<string[]>([]);
  const passphraseRef = useRef('');

  const initiate = useCallback((walletName: string, passphrase = '', network: WalletNetwork = defaultNetwork) => {
    const mnemonic = generateMnemonicUseCase.execute();
    mnemonicRef.current = mnemonic;
    wordsRef.current = mnemonic.split(' ');
    passphraseRef.current = passphrase;
    setState({
      step: 'backup',
      walletName,
      network,
      isLoading: false,
      error: null,
    });
  }, []);

  const proceedToConfirm = useCallback(() => {
    setState(prev => ({ ...prev, step: 'confirming', error: null }));
  }, []);

  const save = useCallback(async (): Promise<Wallet | null> => {
    const { walletName, network } = state;
    const passphrase = passphraseRef.current;
    setState(prev => ({ ...prev, step: 'saving', isLoading: true, error: null }));
    try {
      const wallet = await importWallet(walletName, mnemonicRef.current, network, passphrase || undefined);
      mnemonicRef.current = '';
      wordsRef.current = [];
      passphraseRef.current = '';
      setState(prev => ({ ...prev, isLoading: false }));
      return wallet;
    } catch (err) {
      setState(prev => ({
        ...prev,
        step: 'confirming',
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to create wallet. Please try again.',
      }));
      return null;
    }
  }, [importWallet, state]);

  const reset = useCallback(() => {
    mnemonicRef.current = '';
    wordsRef.current = [];
    passphraseRef.current = '';
    setState(INITIAL);
  }, []);

  // words and passphrase are read from refs here. Because useMemo re-runs whenever
  // `state` changes (and state changes on every flow step), the context value always
  // reflects the current ref values without storing them in React state.
  const value = useMemo<CreateWalletContextValue>(
    () => ({
      ...state,
      words: wordsRef.current,
      passphrase: passphraseRef.current,
      initiate,
      proceedToConfirm,
      save,
      reset,
    }),
    [state, initiate, proceedToConfirm, save, reset],
  );

  return (
    <CreateWalletContext.Provider value={value}>{children}</CreateWalletContext.Provider>
  );
}
