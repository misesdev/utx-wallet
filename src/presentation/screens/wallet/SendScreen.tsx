import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useNetwork } from '../../hooks/useNetwork';
import { useWallet } from '../../hooks/useWallet';

export function SendScreen() {
  const { networkConfig } = useNetwork();
  const { wallets } = useWallet();

  return (
    <AppScreen title="Send">
      <AppCard>
        <AppText variant="subtitle">Transaction draft shell. Building and signing will be handled by use cases later.</AppText>
        <AppText color="muted">
          {networkConfig.network} / {networkConfig.connectivityMode} / {networkConfig.nodeMode}
        </AppText>
        <AppText color="muted">Wallets loaded: {wallets.length}</AppText>
      </AppCard>
      <AppButton title="Review transaction" onPress={() => undefined} />
    </AppScreen>
  );
}
