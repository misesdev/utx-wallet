import { StyleSheet, View } from 'react-native';
import { SUPPORTED_NETWORKS } from '../../../shared/constants/networks';
import type { BitcoinNetwork } from '../../../core/domain/entities/Network';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppInput } from '../../components/base/AppInput';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useSafeMode } from '../../hooks/useSafeMode';

export function NodeSettingsScreen() {
  const {
    form,
    statusLabel,
    setUrl,
    setPort,
    setAuthToken,
    setNetwork,
    testConnection,
    activateSafeMode,
  } = useSafeMode();

  return (
    <AppScreen title="Node settings" subtitle="Personal node connection">
      <AppCard>
        <AppText variant="subtitle">Conexão</AppText>
        <AppInput
          accessibilityLabel="Node URL"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://node.example.com/api"
          value={form.url}
          onChangeText={setUrl}
        />
        <AppInput
          accessibilityLabel="Node port"
          keyboardType="number-pad"
          placeholder="Porta"
          value={form.port}
          onChangeText={setPort}
        />
        <AppInput
          accessibilityLabel="Node auth token"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Token de autenticação"
          secureTextEntry
          value={form.authToken}
          onChangeText={setAuthToken}
        />
      </AppCard>

      <AppCard>
        <AppText variant="subtitle">Rede</AppText>
        <View style={styles.networkGrid}>
          {SUPPORTED_NETWORKS.map(network => (
            <AppButton
              key={network}
              title={network}
              size="sm"
              variant={form.network === network ? 'primary' : 'secondary'}
              onPress={() => setNetwork(network as BitcoinNetwork)}
              style={styles.networkButton}
            />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="subtitle">Status</AppText>
        <AppText color="muted">{statusLabel}</AppText>
      </AppCard>

      <AppButton title="Testar conexão" variant="secondary" onPress={testConnection} />
      <AppButton title="Salvar e ativar modo seguro" onPress={activateSafeMode} />
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
