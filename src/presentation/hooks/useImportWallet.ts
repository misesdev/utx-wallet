import { useState } from 'react';
import type { Wallet } from '../../core/domain/entities/Wallet';
import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import { AppError } from '../../core/application/errors/AppError';
import { useWallet } from './useWallet';
import { useAppTranslation } from './useAppTranslation';

export type ImportWalletHook = {
  walletName: string;
  setWalletName: (v: string) => void;
  seed: string;
  setSeed: (v: string) => void;
  passphrase: string;
  setPassphrase: (v: string) => void;
  selectedNetwork: BitcoinNetwork;
  setSelectedNetwork: (v: BitcoinNetwork) => void;
  isLoading: boolean;
  error: string;
  clearError: () => void;
  submit: () => Promise<Wallet | null>;
};

export function useImportWallet(initialNetwork: BitcoinNetwork = 'testnet'): ImportWalletHook {
  const { importWallet } = useWallet();
  const { t } = useAppTranslation();
  const [walletName, setWalletName] = useState('');
  const [seed, setSeed] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<BitcoinNetwork>(initialNetwork);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(): Promise<Wallet | null> {
    const trimmedName = walletName.trim();
    const trimmedSeed = seed.trim();

    if (!trimmedName) {
      setError(t('createWallet.errorNameRequired'));
      return null;
    }
    if (trimmedName.length > 48) {
      setError(t('createWallet.errorNameTooLong'));
      return null;
    }
    if (!trimmedSeed) {
      setError(t('importWallet.errorSeedRequired'));
      return null;
    }
    setIsLoading(true);
    setError('');
    try {
      const normalizedPassphrase = passphrase.trim() || undefined;
      return await importWallet(trimmedName, trimmedSeed, selectedNetwork, normalizedPassphrase);
    } catch (err) {
      if (err instanceof AppError) {
        if (err.code === 'INVALID_SECRET') {
          setError(t('importWallet.errorInvalidSeed'));
        } else if (err.code === 'WALLET_EXISTS') {
          setError(t('importWallet.errorWalletExists', { name: trimmedName }));
        } else {
          setError(t('importWallet.errorImportFailed'));
        }
      } else {
        setError(t('importWallet.errorImportFailed'));
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    walletName,
    setWalletName,
    seed,
    setSeed,
    passphrase,
    setPassphrase,
    selectedNetwork,
    setSelectedNetwork,
    isLoading,
    error,
    clearError: () => setError(''),
    submit,
  };
}
