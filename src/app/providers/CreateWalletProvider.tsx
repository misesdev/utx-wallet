import React, { createContext, PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react';
import type { Wallet } from '../../core/domain/entities/Wallet';
import { GenerateMnemonicUseCase } from '../../core/domain/usecases/wallet/GenerateMnemonicUseCase';
import { DEFAULT_NETWORK } from '../../shared/constants/networks';
import { useWallet } from '../../presentation/hooks/useWallet';

type WalletNetwork = 'mainnet' | 'testnet';
type Step = 'idle' | 'backup' | 'confirming' | 'saving';

type CreateWalletFlowState = {
  step: Step;
  walletName: string;
  words: string[];
  passphrase: string;
  network: WalletNetwork;
  isLoading: boolean;
  error: string | null;
};

export type CreateWalletContextValue = CreateWalletFlowState & {
  initiate(walletName: string, passphrase?: string, network?: WalletNetwork): void;
  proceedToConfirm(): void;
  save(): Promise<Wallet | null>;
  reset(): void;
};

export const CreateWalletContext = createContext<CreateWalletContextValue | null>(null);

const defaultNetwork: WalletNetwork =
  DEFAULT_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';

const INITIAL: CreateWalletFlowState = {
  step: 'idle',
  walletName: '',
  words: [],
  passphrase: '',
  network: defaultNetwork,
  isLoading: false,
  error: null,
};

const generateMnemonicUseCase = new GenerateMnemonicUseCase();

export function CreateWalletProvider({ children }: PropsWithChildren) {
  const { importWallet } = useWallet();
  const [state, setState] = useState<CreateWalletFlowState>(INITIAL);

  // Keep mnemonic out of plain state so it isn't exposed in DevTools snapshots
  const mnemonicRef = useRef('');

  const initiate = useCallback((walletName: string, passphrase = '', network: WalletNetwork = defaultNetwork) => {
    const mnemonic = generateMnemonicUseCase.execute();
    mnemonicRef.current = mnemonic;
    setState({
      step: 'backup',
      walletName,
      words: mnemonic.split(' '),
      passphrase,
      network,
      isLoading: false,
      error: null,
    });
  }, []);

  const proceedToConfirm = useCallback(() => {
    setState(prev => ({ ...prev, step: 'confirming', error: null }));
  }, []);

  const save = useCallback(async (): Promise<Wallet | null> => {
    const { walletName, passphrase, network } = state;
    setState(prev => ({ ...prev, step: 'saving', isLoading: true, error: null }));
    try {
      const wallet = await importWallet(walletName, mnemonicRef.current, network, passphrase || undefined);
      mnemonicRef.current = '';
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
