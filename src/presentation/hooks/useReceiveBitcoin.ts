import { useCallback, useEffect, useState } from 'react';
import { Share } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import type { Address } from '../../core/domain/entities/Address';
import { useAddress } from '../../app/providers/AddressProvider';
import { useWallet } from './useWallet';

export type ReceiveBitcoinState = {
  address: Address | null;
  isLoading: boolean;
  error: string | null;
  amountSats: string;
  bitcoinUri: string;
  setAmountSats: (value: string) => void;
  copyAddress: () => void;
  shareAddress: () => Promise<void>;
  generateNewAddress: () => Promise<void>;
};

function buildBitcoinUri(address: string, amountSats: string): string {
  const trimmed = amountSats.trim();
  if (!trimmed || trimmed === '0') return address;
  const sats = parseInt(trimmed, 10);
  if (isNaN(sats) || sats <= 0) return address;
  const btc = (sats / 1e8).toFixed(8).replace(/\.?0+$/, '');
  return `bitcoin:${address}?amount=${btc}`;
}

export function useReceiveBitcoin(): ReceiveBitcoinState {
  const { selectedWallet } = useWallet();
  const { getCurrentReceiveAddress, generateNewReceiveAddress } = useAddress();

  const [address, setAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountSats, setAmountSats] = useState('');

  const loadAddress = useCallback(async () => {
    if (!selectedWallet) return;
    setIsLoading(true);
    setError(null);
    try {
      const addr = await getCurrentReceiveAddress(selectedWallet.id);
      setAddress(addr);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load address');
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, getCurrentReceiveAddress]);

  useEffect(() => {
    loadAddress();
  }, [loadAddress]);

  const copyAddress = useCallback(() => {
    if (!address) return;
    Clipboard.setString(address.value);
  }, [address]);

  const shareAddress = useCallback(async () => {
    if (!address) return;
    const uri = buildBitcoinUri(address.value, amountSats);
    await Share.share({ message: uri });
  }, [address, amountSats]);

  const generateNewAddress = useCallback(async () => {
    if (!selectedWallet) return;
    setIsLoading(true);
    setError(null);
    try {
      const addr = await generateNewReceiveAddress(selectedWallet.id);
      setAddress(addr);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate address');
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, generateNewReceiveAddress]);

  const bitcoinUri = address ? buildBitcoinUri(address.value, amountSats) : '';

  return {
    address,
    isLoading,
    error,
    amountSats,
    bitcoinUri,
    setAmountSats,
    copyAddress,
    shareAddress,
    generateNewAddress,
  };
}
