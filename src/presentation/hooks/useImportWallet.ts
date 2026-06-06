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
  selectedNetwork: BitcoinNetwork;
  setSelectedNetwork: (v: BitcoinNetwork) => void;
  isLoading: boolean;
  error: string;
  clearError: () => void;
  submit: () => Promise<Wallet | null>;
};

export function useImportWallet(): ImportWalletHook {
  const { importWallet } = useWallet();
  const [walletName, setWalletName] = useState('');
  const [seed, setSeed] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<BitcoinNetwork>('testnet4');
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

    setIsLoading(true);
    setError('');
    try {
      return await importWallet(trimmedName, trimmedSeed, selectedNetwork);
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
    selectedNetwork,
    setSelectedNetwork,
    isLoading,
    error,
    clearError: () => setError(''),
    submit,
  };
}
