import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useNetworkSettings } from '../../hooks/useNetworkSettings';

export function NetworkSettingsScreen() {
  const {
    activeNetwork,
    pendingNetwork,
    options,
    warning,
    error,
    isSaving,
    selectNetwork,
    confirmNetworkChange,
  } = useNetworkSettings();

  return (
    <AppScreen title="Network settings" subtitle="Choose the active Bitcoin network">
      <AppCard>
        <AppText variant="subtitle">Rede ativa</AppText>
        <AppText color="muted">{activeNetwork}</AppText>
      </AppCard>

      <AppCard>
        <AppText variant="subtitle">Selecionar rede</AppText>
        <View style={styles.networkGrid}>
          {options.map(option => (
            <AppButton
              key={option.network}
              title={option.network}
              size="sm"
              variant={pendingNetwork === option.network ? 'primary' : 'secondary'}
              disabled={!option.isWalletCompatible}
              onPress={() => selectNetwork(option.network)}
              style={styles.networkButton}
            />
          ))}
        </View>
        <AppText variant="caption" color="muted">
          Redes incompatíveis com a carteira atual ficam bloqueadas.
        </AppText>
      </AppCard>

      {warning ? (
        <AppCard accent>
          <AppText variant="subtitle">Atenção</AppText>
          <AppText color="muted">{warning}</AppText>
        </AppCard>
      ) : null}

      {error ? (
        <AppCard>
          <AppText variant="subtitle" color="danger">Rede incompatível</AppText>
          <AppText color="muted">{error}</AppText>
        </AppCard>
      ) : null}

      <AppButton
        title={isSaving ? 'Salvando...' : 'Aplicar rede'}
        disabled={isSaving || activeNetwork === pendingNetwork}
        onPress={confirmNetworkChange}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  networkButton: {
    minWidth: 104,
  },
});
