import { useCallback, useEffect, useState } from 'react';
import { AppError } from '../../core/application/errors/AppError';
import type { WalletExportFormat } from '../../core/domain/usecases/wallet/ExportWalletKeyUseCase';
import { useWallet } from './useWallet';

export type UseWalletExportState = {
  formats: WalletExportFormat[];
  loadingFormats: boolean;
  formatsError: string | null;
  exportKey: (format: WalletExportFormat) => Promise<string>;
};

export function useWalletExport(): UseWalletExportState {
  const { selectedWallet, exportWalletKey, getExportFormats } = useWallet();

  const [formats, setFormats] = useState<WalletExportFormat[]>([]);
  const [loadingFormats, setLoadingFormats] = useState(true);
  const [formatsError, setFormatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedWallet) {
      setLoadingFormats(false);
      return;
    }
    setLoadingFormats(true);
    setFormatsError(null);
    getExportFormats(selectedWallet.id)
      .then(setFormats)
      .catch(e => setFormatsError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingFormats(false));
  }, [selectedWallet?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportKey = useCallback(
    async (format: WalletExportFormat): Promise<string> => {
      if (!selectedWallet) {
        throw new AppError('No wallet selected', 'WALLET_NOT_FOUND');
      }
      const result = await exportWalletKey({
        walletId: selectedWallet.id,
        format,
        network: selectedWallet.network,
      });
      return result.value;
    },
    [selectedWallet, exportWalletKey],
  );

  return { formats, loadingFormats, formatsError, exportKey };
}
