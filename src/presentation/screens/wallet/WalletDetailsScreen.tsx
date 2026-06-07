import { useAppTranslation } from '../../hooks/useAppTranslation';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useNetwork } from '../../hooks/useNetwork';
import { useWallet } from '../../hooks/useWallet';

export function WalletDetailsScreen() {
  const { networkConfig } = useNetwork();
  const { wallets } = useWallet();
  const { t } = useAppTranslation();

  return (
    <AppScreen title={t('walletDetails.title')}>
      <AppCard>
        <AppText variant="subtitle">{t('walletDetails.subtitle')}</AppText>
        <AppText color="muted">
          {networkConfig.network} / {networkConfig.connectivityMode} / {networkConfig.nodeMode}
        </AppText>
        <AppText color="muted">{t('walletDetails.walletsLoaded', { count: wallets.length })}</AppText>
      </AppCard>
      <AppButton title={t('walletDetails.viewUtxos')} onPress={() => undefined} />
    </AppScreen>
  );
}
