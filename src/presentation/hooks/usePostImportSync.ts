import { useState } from 'react';
import { AppRoutes } from '../../app/navigation/routes';
import { useAddressManager } from '../../app/providers/AddressManagerProvider';
import { useAppNavigation } from './useAppNavigation';
import { useAppTranslation } from './useAppTranslation';
import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import type { WalletSetupStep } from '../components/wallet/WalletSetupProgressModal';

/**
 * Encapsulates the post-import discovery + sync flow shared between
 * ImportWalletScreen (mnemonic) and ConfirmQrWalletImportScreen (HD keys / WIF).
 *
 * The caller is responsible for the wallet creation step ('importing').
 * This hook takes over from 'discovering' onward and drives the
 * WalletSetupProgressModal to completion.
 */
export function usePostImportSync() {
  const { importSync } = useAddressManager();
  const navigation = useAppNavigation();
  const { t } = useAppTranslation();

  const [setupStep, setSetupStep] = useState<WalletSetupStep>('importing');
  const [setupVisible, setSetupVisible] = useState(false);
  const [setupError, setSetupError] = useState<string | undefined>();
  const [subMessage, setSubMessage] = useState<string | undefined>();

  function showImportingStep(subMsg?: string): void {
    setSetupStep('importing');
    setSetupError(undefined);
    setSubMessage(subMsg);
    setSetupVisible(true);
  }

  function hideProgress(): void {
    setSetupVisible(false);
  }

  async function runSync(walletId: string, network: BitcoinNetwork): Promise<void> {
    setSetupStep('discovering');
    setSetupError(undefined);
    setSubMessage(undefined);

    try {
      await importSync(walletId, network, (progress) => {
        if (progress.phase === 'syncing') {
          setSetupStep('syncing');
          setSubMessage(t('walletSetup.syncingChain'));
          return;
        }
        if (progress.txFound) {
          setSubMessage(t('walletSetup.foundActivity', { account: progress.accountIndex }));
        } else {
          setSubMessage(
            t('walletSetup.checkingAddress', {
              account: progress.accountIndex,
              index: progress.addressIndex + 1,
            }),
          );
        }
      });
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : undefined);
      setSetupStep('error');
      return;
    }

    setSubMessage(undefined);
    setSetupStep('done');
  }

  function handleDone(): void {
    setSetupVisible(false);
    navigation.reset({ index: 0, routes: [{ name: AppRoutes.Home }] });
  }

  function handleRetry(): void {
    setSetupVisible(false);
  }

  return {
    setupStep,
    setupVisible,
    setupError,
    subMessage,
    showImportingStep,
    hideProgress,
    runSync,
    handleDone,
    handleRetry,
  };
}
