import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeeRates } from '../../core/domain/repositories/BlockchainProvider';
import type { TransactionPreview, FeeRateTier } from '../../core/domain/entities/TransactionPreview';
import type { BroadcastResult } from '../../core/domain/usecases/transaction/BroadcastTransactionUseCase';
import { AppError } from '../../core/application/errors/AppError';
import { useSend } from '../../app/providers/SendProvider';
import { useAddressManager } from '../../app/providers/AddressManagerProvider';
import { useNetwork } from './useNetwork';
import { useWallet } from './useWallet';
import { useAppTranslation } from './useAppTranslation';

export type { FeeRateTier };

export type SendBitcoinState = {
  toAddress: string;
  amountSats: string;
  feeTier: FeeRateTier;
  customFeeRate: string;
  availableBalanceSats: number;
  feeRates: FeeRates | null;
  isLoadingFeeRates: boolean;
  addressError: string | null;
  amountError: string | null;
  preview: TransactionPreview | null;
  isPreviewing: boolean;
  previewError: string | null;
  selectedFeeRate: number;
  isReviewVisible: boolean;
  isSending: boolean;
  sendError: string | null;
  sentResult: BroadcastResult | null;
  isWatchOnly: boolean;
  payFee: boolean;
  setToAddress: (v: string) => void;
  setAmountSats: (v: string) => void;
  setFeeTier: (tier: FeeRateTier) => void;
  setCustomFeeRate: (v: string) => void;
  reviewTransaction: () => Promise<void>;
  clearPreview: () => void;
  openReview: () => void;
  closeReview: () => void;
  sendTransaction: () => Promise<void>;
  resetSend: () => void;
  setPayFee: (v: boolean) => void;
};

export type UseSendBitcoinOpts = {
  originId?: string;
  initialAddress?: string;
  initialAmount?: string;
};

export function useSendBitcoin(opts?: UseSendBitcoinOpts): SendBitcoinState {
  const { selectedWallet, listUtxos } = useWallet();
  const { t } = useAppTranslation();
  const { isOnline } = useNetwork();
  const { validateAddress, fetchFeeRates, preview, send } = useSend();
  const { listAddresses } = useAddressManager();
  const originId = opts?.originId;
  const isWatchOnly = selectedWallet?.status === 'watch-only';

  const [toAddress, setToAddressRaw] = useState(opts?.initialAddress ?? '');
  const [amountSats, setAmountSatsRaw] = useState(opts?.initialAmount ?? '');
  const [feeTier, setFeeTierRaw] = useState<FeeRateTier>('normal');
  const [customFeeRate, setCustomFeeRateRaw] = useState('');

  const [availableBalanceSats, setAvailableBalanceSats] = useState(0);
  const [feeRates, setFeeRates] = useState<FeeRates | null>(null);
  const [isLoadingFeeRates, setIsLoadingFeeRates] = useState(false);

  const [addressError, setAddressError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const [txPreview, setTxPreview] = useState<TransactionPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isReviewVisible, setIsReviewVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentResult, setSentResult] = useState<BroadcastResult | null>(null);
  const [payFee, setPayFeeRaw] = useState(false);

  // Stable ref to addresses belonging to the selected origin — used in send/preview callbacks
  const originAddressesRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (!selectedWallet || !isOnline) return;
    setIsLoadingFeeRates(true);
    Promise.all([fetchFeeRates(), listUtxos(selectedWallet.id), listAddresses(selectedWallet.id)])
      .then(([rates, utxos, addresses]) => {
        setFeeRates(rates);
        const filtered = originId
          ? addresses.filter(a => a.originId === originId).map(a => a.address)
          : null;
        originAddressesRef.current = filtered;
        const allowedSet = filtered ? new Set(filtered) : null;
        setAvailableBalanceSats(
          utxos
            .filter(u => u.isConfirmed && !u.isFrozen)
            .filter(u => !allowedSet || allowedSet.has(u.address))
            .reduce((sum, u) => sum + u.valueSats, 0),
        );
      })
      .catch(() => {})
      .finally(() => setIsLoadingFeeRates(false));
  }, [selectedWallet, isOnline, fetchFeeRates, listUtxos, listAddresses, originId]);

  const selectedFeeRate = useMemo(() => {
    if (feeTier === 'custom') {
      const parsed = parseFloat(customFeeRate);
      return parsed > 0 ? parsed : 1;
    }
    if (!feeRates) return 1;
    const map: Record<Exclude<FeeRateTier, 'custom'>, number> = {
      economy: feeRates.economySatsPerVByte,
      normal: feeRates.halfHourSatsPerVByte,
      fast: feeRates.fastSatsPerVByte,
    };
    return map[feeTier as Exclude<FeeRateTier, 'custom'>] ?? 1;
  }, [feeTier, customFeeRate, feeRates]);

  const setToAddress = useCallback(
    (value: string) => {
      setToAddressRaw(value);
      setTxPreview(null);
      setPreviewError(null);
      if (value.trim().length === 0) {
        setAddressError(null);
        return;
      }
      const result = validateAddress(value.trim());
      setAddressError(result.valid ? null : t('send.errorInvalidAddress'));
    },
    [validateAddress, t],
  );

  const setAmountSats = useCallback((v: string) => {
    setAmountSatsRaw(v);
    setAmountError(null);
    setTxPreview(null);
    setPreviewError(null);
  }, []);

  const setFeeTier = useCallback((tier: FeeRateTier) => {
    setFeeTierRaw(tier);
    setTxPreview(null);
    setPreviewError(null);
  }, []);

  const setCustomFeeRate = useCallback((v: string) => {
    setCustomFeeRateRaw(v);
    setTxPreview(null);
    setPreviewError(null);
  }, []);

  const setPayFee = useCallback((v: boolean) => {
    setPayFeeRaw(v);
    setTxPreview(null);
    setPreviewError(null);
  }, []);

  const reviewTransaction = useCallback(async () => {
    if (!selectedWallet) return;

    const parsedAmount = parseInt(amountSats.trim(), 10);
    if (!amountSats.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError(t('send.errorInvalidAmount'));
      return;
    }
    if (addressError !== null || !toAddress.trim()) {
      return;
    }

    setIsPreviewing(true);
    setPreviewError(null);
    setTxPreview(null);
    try {
      const result = await preview({
        walletId: selectedWallet.id,
        toAddress: toAddress.trim(),
        amountSats: parsedAmount,
        feeRateSatsPerVByte: selectedFeeRate,
        subtractFeeFromAmount: !payFee,
        allowedAddresses: originAddressesRef.current ?? undefined,
      });
      setTxPreview(result);
    } catch (err) {
      setPreviewError(err instanceof AppError ? err.message : t('send.errorPreviewFailed'));
    } finally {
      setIsPreviewing(false);
    }
  }, [selectedWallet, toAddress, amountSats, selectedFeeRate, addressError, preview, payFee, t]);

  const clearPreview = useCallback(() => {
    setTxPreview(null);
    setPreviewError(null);
  }, []);

  const openReview = useCallback(() => {
    setSendError(null);
    setIsReviewVisible(true);
  }, []);

  const closeReview = useCallback(() => {
    setIsReviewVisible(false);
    setSendError(null);
  }, []);

  const sendTransaction = useCallback(async () => {
    if (!selectedWallet) return;
    const parsedAmount = parseInt(amountSats.trim(), 10);
    if (!amountSats.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

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
        allowedAddresses: originAddressesRef.current ?? undefined,
      });
      setSentResult(result);
      setIsReviewVisible(false);
    } catch (err) {
      setSendError(err instanceof AppError ? err.message : t('send.errorSendFailed'));
    } finally {
      setIsSending(false);
    }
  }, [selectedWallet, toAddress, amountSats, selectedFeeRate, send, originId, payFee, t]);

  const resetSend = useCallback(() => {
    setSentResult(null);
    setSendError(null);
    setIsReviewVisible(false);
    setTxPreview(null);
    setToAddressRaw('');
    setAmountSatsRaw('');
    setFeeTierRaw('normal');
    setCustomFeeRateRaw('');
    setAddressError(null);
    setAmountError(null);
    setPayFeeRaw(false);
  }, []);

  return {
    toAddress,
    amountSats,
    feeTier,
    customFeeRate,
    availableBalanceSats,
    feeRates,
    isLoadingFeeRates,
    addressError,
    amountError,
    preview: txPreview,
    isPreviewing,
    previewError,
    selectedFeeRate,
    isReviewVisible,
    isSending,
    sendError,
    sentResult,
    isWatchOnly,
    payFee,
    setToAddress,
    setAmountSats,
    setFeeTier,
    setCustomFeeRate,
    reviewTransaction,
    clearPreview,
    openReview,
    closeReview,
    sendTransaction,
    resetSend,
    setPayFee,
  };
}
