import { useCallback, useEffect, useRef, useState } from 'react';
import type { BroadcastResult } from '../../core/domain/usecases/transaction/BroadcastTransactionUseCase';
import { AppError } from '../../core/application/errors/AppError';
import { useSend } from '../../app/providers/SendProvider';
import { useAddressManager } from '../../app/providers/AddressManagerProvider';
import { useWallet } from './useWallet';
import { useAppTranslation } from './useAppTranslation';

export type UseConfirmTransactionOpts = {
  originId?: string;
  toAddress: string;
  amountSats: string;
  selectedFeeRate: number;
  payFee: boolean;
};

export type ConfirmTransactionState = {
  isSending: boolean;
  sendError: string | null;
  sentResult: BroadcastResult | null;
  sendTransaction: () => Promise<void>;
};

export function useConfirmTransaction(opts: UseConfirmTransactionOpts): ConfirmTransactionState {
  const { selectedWallet } = useWallet();
  const { send } = useSend();
  const { listAddresses } = useAddressManager();
  const { t } = useAppTranslation();

  const { originId, toAddress, amountSats, selectedFeeRate, payFee } = opts;

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentResult, setSentResult] = useState<BroadcastResult | null>(null);

  const allowedAddressesRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (!originId || !selectedWallet) {
      allowedAddressesRef.current = null;
      return;
    }
    listAddresses(selectedWallet.id)
      .then(addresses => {
        allowedAddressesRef.current = addresses
          .filter(a => a.originId === originId)
          .map(a => a.address);
      })
      .catch(() => {});
  }, [originId, selectedWallet, listAddresses]);

  const sendTransaction = useCallback(async () => {
    if (!selectedWallet) return;
    const parsedAmount = parseInt(amountSats, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSending(true);
    setSendError(null);
    setSentResult(null);
    try {
      const result = await send({
        walletId: selectedWallet.id,
        walletNetwork: selectedWallet.network,
        toAddress: toAddress.trim(),
        amountSats: parsedAmount,
        feeRateSatsPerVByte: selectedFeeRate,
        changeOriginId: originId,
        subtractFeeFromAmount: !payFee,
        allowedAddresses: allowedAddressesRef.current ?? undefined,
      });
      setSentResult(result);
    } catch (err) {
      setSendError(err instanceof AppError ? err.message : t('send.errorSendFailed'));
    } finally {
      setIsSending(false);
    }
  }, [selectedWallet, toAddress, amountSats, selectedFeeRate, originId, payFee, send, t]);

  return { isSending, sendError, sentResult, sendTransaction };
}
