import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useNetwork } from '../../hooks/useNetwork';
import { useWallet } from '../../hooks/useWallet';

export function SafeModeScreen() {
  const { networkConfig } = useNetwork();
  const { wallets } = useWallet();

  return (
    <AppScreen title="Safe mode">
      <AppCard>
        <AppText variant="subtitle">Personal-node-first mode for constrained network exposure.</AppText>
        <AppText color="muted">
          {networkConfig.network} / {networkConfig.connectivityMode} / {networkConfig.nodeMode}
        </AppText>
        <AppText color="muted">Wallets loaded: {wallets.length}</AppText>
      </AppCard>
      <AppButton title="Use own node" onPress={() => undefined} />
    </AppScreen>
  );
}
