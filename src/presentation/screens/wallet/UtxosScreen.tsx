import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useNetwork } from '../../hooks/useNetwork';
import { useWallet } from '../../hooks/useWallet';

export function UtxosScreen() {
  const { networkConfig } = useNetwork();
  const { wallets } = useWallet();

  return (
    <AppScreen title="UTXOs">
      <AppCard>
        <AppText variant="subtitle">Coin control and UTXO list placeholder for future sync integration.</AppText>
        <AppText color="muted">
          {networkConfig.network} / {networkConfig.connectivityMode} / {networkConfig.nodeMode}
        </AppText>
        <AppText color="muted">Wallets loaded: {wallets.length}</AppText>
      </AppCard>
      <AppButton title="Refresh" onPress={() => undefined} />
    </AppScreen>
  );
}
