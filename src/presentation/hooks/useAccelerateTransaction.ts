import { useState, useCallback, useEffect } from 'react';
import type { RbfInfo } from '../../core/domain/entities/RbfInfo';
import type { BroadcastResult } from '../../core/domain/usecases/transaction/BroadcastTransactionUseCase';
import { useAccelerate } from '../../app/providers/AccelerateProvider';
import { useWallet } from './useWallet';
import { useAppTranslation } from './useAppTranslation';
import { AppError } from '../../core/application/errors/AppError';
import { calcNewFeeSats, calcNewChangeSats } from '../../core/domain/services/RbfService';

export type UseAccelerateTransactionParams = {
  txid: string;
  toAddress: string;
  isConfirmed: boolean;
};

export type UseAccelerateState = {
  rbfInfo: RbfInfo | null;
  isLoadingInfo: boolean;
  infoError: string | null;
  newFeeRateSatsPerVByte: number;
  newFeeSats: number;
  newChangeSats: number;
  isAccelerating: boolean;
  accelerateError: string | null;
  acceleratedTxid: string | null;
  setNewFeeRate: (rate: number) => void;
  accelerate: () => Promise<void>;
};

export function useAccelerateTransaction(params: UseAccelerateTransactionParams): UseAccelerateState {
  const { txid, toAddress, isConfirmed } = params;
  const { getRbfInfo, accelerate: accelerateUseCase } = useAccelerate();
  const { selectedWallet } = useWallet();
  const { t } = useAppTranslation();

  const [rbfInfo, setRbfInfo] = useState<RbfInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [newFeeRateSatsPerVByte, setNewFeeRateSatsPerVByte] = useState(0);
  const [isAccelerating, setIsAccelerating] = useState(false);
  const [accelerateError, setAccelerateError] = useState<string | null>(null);
  const [acceleratedTxid, setAcceleratedTxid] = useState<string | null>(null);

  const walletIsWatchOnly = selectedWallet?.status === 'watch-only';

  // Derive fee/change from current rbfInfo + newFeeRate
  const newFeeSats = rbfInfo
    ? calcNewFeeSats(rbfInfo.estimatedVBytes, newFeeRateSatsPerVByte)
    : 0;
  const totalInputSats = rbfInfo
    ? rbfInfo.rawInputs.reduce((sum, i) => sum + i.prevoutValue, 0)
    : 0;
  const newChangeSats = rbfInfo
    ? calcNewChangeSats(totalInputSats, rbfInfo.recipientAmountSats, newFeeSats)
    : 0;

  const loadInfo = useCallback(async () => {
    setIsLoadingInfo(true);
    setInfoError(null);
    try {
      const info = await getRbfInfo({
        txid,
        toAddress,
        walletIsWatchOnly: walletIsWatchOnly ?? false,
        isConfirmed,
      });
      setRbfInfo(info);
      // Default new fee rate to current + 1
      if (info.isRbfEligible) {
        setNewFeeRateSatsPerVByte(info.currentFeeRate + 1);
      }
    } catch (err) {
      setInfoError(err instanceof AppError ? err.message : t('common.error'));
    } finally {
      setIsLoadingInfo(false);
    }
  }, [txid, toAddress, walletIsWatchOnly, isConfirmed, getRbfInfo, t]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const setNewFeeRate = useCallback((rate: number) => {
    setNewFeeRateSatsPerVByte(rate);
  }, []);

  const accelerate = useCallback(async () => {
    if (!rbfInfo || !selectedWallet) return;

    setIsAccelerating(true);
    setAccelerateError(null);
    try {
      const result: BroadcastResult = await accelerateUseCase({
        walletId: selectedWallet.id,
        walletNetwork: selectedWallet.network,
        rbfInfo,
        newFeeRateSatsPerVByte,
      });
      setAcceleratedTxid(result.txid);
    } catch (err) {
      setAccelerateError(err instanceof AppError ? err.message : t('common.error'));
    } finally {
      setIsAccelerating(false);
    }
  }, [rbfInfo, selectedWallet, accelerateUseCase, newFeeRateSatsPerVByte, t]);

  return {
    rbfInfo,
    isLoadingInfo,
    infoError,
    newFeeRateSatsPerVByte,
    newFeeSats,
    newChangeSats,
    isAccelerating,
    accelerateError,
    acceleratedTxid,
    setNewFeeRate,
    accelerate,
  };
}
