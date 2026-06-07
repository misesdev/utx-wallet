import { useState } from 'react';
import type { Wallet } from '../../core/domain/entities/Wallet';
import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import { AppError } from '../../core/application/errors/AppError';
import { useWallet } from './useWallet';

export type ImportWalletHook = {
  walletName: string;
  setWalletName: (v: string) => void;
  seed: string;
  setSeed: (v: string) => void;
  passphrase: string;
  setPassphrase: (v: string) => void;
  confirmPassphrase: string;
  setConfirmPassphrase: (v: string) => void;
  selectedNetwork: BitcoinNetwork;
  setSelectedNetwork: (v: BitcoinNetwork) => void;
  isLoading: boolean;
  error: string;
  clearError: () => void;
  submit: () => Promise<Wallet | null>;
};

export function useImportWallet(initialNetwork: BitcoinNetwork = 'testnet'): ImportWalletHook {
  const { importWallet } = useWallet();
  const [walletName, setWalletName] = useState('');
  const [seed, setSeed] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<BitcoinNetwork>(initialNetwork);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(): Promise<Wallet | null> {
    const trimmedName = walletName.trim();
    const trimmedSeed = seed.trim();

    if (!trimmedName) {
      setError('Wallet name is required');
      return null;
    }
    if (trimmedName.length > 48) {
      setError('Name must be 48 characters or fewer');
      return null;
    }
    if (!trimmedSeed) {
      setError('Seed phrase is required');
      return null;
    }
    if (passphrase && passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
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
          setError('Invalid seed phrase. Please check your words and try again.');
        } else if (err.code === 'WALLET_EXISTS') {
          setError(`A wallet named "${trimmedName}" already exists.`);
        } else {
          setError('Failed to import wallet. Please try again.');
        }
      } else {
        setError('Failed to import wallet. Please try again.');
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
    confirmPassphrase,
    setConfirmPassphrase,
    selectedNetwork,
    setSelectedNetwork,
    isLoading,
    error,
    clearError: () => setError(''),
    submit,
  };
}
