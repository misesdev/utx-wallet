import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useNetwork } from '../../hooks/useNetwork';
import { AppRoutes } from '../../../app/navigation/routes';
import type { AppStackParamList } from '../../../app/navigation/routes';

type SettingsRoute = keyof Pick<
  AppStackParamList,
  | 'SecuritySettings'
  | 'NetworkSettings'
  | 'NodeSettings'
  | 'BackupSettings'
  | 'OfflineMode'
  | 'SafeMode'
>;

type SettingsSectionItem = {
  title: string;
  description: string;
  route: SettingsRoute;
  testID?: string;
};

const SECTIONS: SettingsSectionItem[] = [
  {
    title: 'Security',
    description: 'PIN, biometrics, auto-lock, hide balance',
    route: 'SecuritySettings',
    testID: 'settings-security',
  },
  {
    title: 'Network',
    description: 'Mainnet / testnet, connectivity mode',
    route: 'NetworkSettings',
    testID: 'settings-network',
  },
  {
    title: 'Node',
    description: 'Connect to your own Bitcoin node',
    route: 'NodeSettings',
    testID: 'settings-node',
  },
  {
    title: 'Backup',
    description: 'View and export your seed phrase',
    route: 'BackupSettings',
    testID: 'settings-backup',
  },
  {
    title: 'Offline Mode',
    description: 'Build transactions without internet',
    route: 'OfflineMode',
    testID: 'settings-offline',
  },
  {
    title: 'Safe Mode',
    description: 'Restrict outgoing transactions',
    route: 'SafeMode',
    testID: 'settings-safe-mode',
  },
];

export function SettingsScreen() {
  const navigation = useAppNavigation();
  const { networkConfig } = useNetwork();

  return (
    <AppScreen title="Settings">
      <AppCard>
        <View style={styles.networkRow}>
          <AppText variant="label" color="muted">Network</AppText>
          <AppText variant="body">{networkConfig.network}</AppText>
        </View>
      </AppCard>

      {SECTIONS.map(({ title, description, route, testID }) => (
        <AppButton
          key={route}
          title={title}
          variant="secondary"
          size="lg"
          testID={testID}
          onPress={() => navigation.navigate(AppRoutes[route])}
          accessibilityHint={description}
        />
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  networkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
