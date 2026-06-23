import { useCallback, useEffect, useState } from 'react';
import { Share } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import type { Address } from '../../core/domain/entities/Address';
import type { WalletAddress } from '../../core/domain/entities/WalletAddress';
import { useAddress } from '../../app/providers/AddressProvider';
import { useAddressManager } from '../../app/providers/AddressManagerProvider';
import { useWallet } from './useWallet';
import { useAppTranslation } from './useAppTranslation';

export type ReceiveBitcoinState = {
  address: Address | null;
  hdAddress: WalletAddress | null;
  isLoading: boolean;
  error: string | null;
  amountSats: string;
  bitcoinUri: string;
  setAmountSats: (value: string) => void;
  copyAddress: () => void;
  shareAddress: () => Promise<void>;
};

function buildBitcoinUri(address: string, amountSats: string): string {
  const trimmed = amountSats.trim();
  if (!trimmed || trimmed === '0') return address;
  const sats = parseInt(trimmed, 10);
  if (isNaN(sats) || sats <= 0) return address;
  const btc = (sats / 1e8).toFixed(8).replace(/\.?0+$/, '');
  return `bitcoin:${address}?amount=${btc}`;
}

export function useReceiveBitcoin(originId?: string): ReceiveBitcoinState {
  const { selectedWallet } = useWallet();
  const { t } = useAppTranslation();
  const { getCurrentReceiveAddress } = useAddress();
  const addressManager = useAddressManager();

  const [address, setAddress] = useState<Address | null>(null);
  const [hdAddress, setHdAddress] = useState<WalletAddress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountSats, setAmountSats] = useState('');

  const loadAddress = useCallback(async () => {
    if (!selectedWallet) return;
    setIsLoading(true);
    setError(null);
    try {
      // Try HD address system first
      try {
        const hd = await addressManager.getReceiveAddress(
          selectedWallet.id,
          selectedWallet.network,
          originId,
        );
        setHdAddress(hd);
        // Expose as legacy Address shape for backward-compatible consumers
        setAddress({ id: hd.id, accountId: selectedWallet.id, value: hd.address, network: selectedWallet.network, type: 'p2wpkh', isChange: false, index: hd.index, isUsed: false });
        return;
      } catch {
        // Fall back to legacy system if HD system not initialized
      }
      const addr = await getCurrentReceiveAddress(selectedWallet.id);
      setAddress(addr);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('receive.errorLoadAddress'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, originId, getCurrentReceiveAddress, addressManager, t]);

  useEffect(() => {
    loadAddress();
  }, [loadAddress]);

  const resolvedAddressValue = hdAddress?.address ?? address?.value ?? '';

  const copyAddress = useCallback(() => {
    if (!resolvedAddressValue) return;
    Clipboard.setString(resolvedAddressValue);
  }, [resolvedAddressValue]);

  const shareAddress = useCallback(async () => {
    if (!resolvedAddressValue) return;
    const uri = buildBitcoinUri(resolvedAddressValue, amountSats);
    await Share.share({ message: uri });
  }, [resolvedAddressValue, amountSats]);

  const bitcoinUri = resolvedAddressValue ? buildBitcoinUri(resolvedAddressValue, amountSats) : '';

  return {
    address,
    hdAddress,
    isLoading,
    error,
    amountSats,
    bitcoinUri,
    setAmountSats,
    copyAddress,
    shareAddress,
  };
}
