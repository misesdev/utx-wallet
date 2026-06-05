import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useNetwork } from '../../hooks/useNetwork';
import { useWallet } from '../../hooks/useWallet';

export function TransactionDetailsScreen() {
  const { networkConfig } = useNetwork();
  const { wallets } = useWallet();

  return (
    <AppScreen title="Transaction details">
      <AppCard>
        <AppText variant="subtitle">Transaction metadata and confirmation status placeholder.</AppText>
        <AppText color="muted">
          {networkConfig.network} / {networkConfig.connectivityMode} / {networkConfig.nodeMode}
        </AppText>
        <AppText color="muted">Wallets loaded: {wallets.length}</AppText>
      </AppCard>
      <AppButton title="Close" onPress={() => undefined} />
    </AppScreen>
  );
}
