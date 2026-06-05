import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useNetwork } from '../../hooks/useNetwork';
import { useWallet } from '../../hooks/useWallet';

export function SettingsScreen() {
  const { networkConfig } = useNetwork();
  const { wallets } = useWallet();

  return (
    <AppScreen title="Settings">
      <AppCard>
        <AppText variant="subtitle">Security, network, backup, and node preferences.</AppText>
        <AppText color="muted">
          {networkConfig.network} / {networkConfig.connectivityMode} / {networkConfig.nodeMode}
        </AppText>
        <AppText color="muted">Wallets loaded: {wallets.length}</AppText>
      </AppCard>
      <AppButton title="Security" onPress={() => undefined} />
      <AppButton title="Network" onPress={() => undefined} />
    </AppScreen>
  );
}
