import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../../presentation/screens/home/HomeScreen';
import { OfflineModeScreen } from '../../presentation/screens/offline/OfflineModeScreen';
import { SafeModeScreen } from '../../presentation/screens/safe-mode/SafeModeScreen';
import { BackupSettingsScreen } from '../../presentation/screens/settings/BackupSettingsScreen';
import { NetworkSettingsScreen } from '../../presentation/screens/settings/NetworkSettingsScreen';
import { NodeSettingsScreen } from '../../presentation/screens/settings/NodeSettingsScreen';
import { SecuritySettingsScreen } from '../../presentation/screens/settings/SecuritySettingsScreen';
import { SettingsScreen } from '../../presentation/screens/settings/SettingsScreen';
import { ReceiveScreen } from '../../presentation/screens/wallet/ReceiveScreen';
import { SendScreen } from '../../presentation/screens/wallet/SendScreen';
import { TransactionDetailsScreen } from '../../presentation/screens/wallet/TransactionDetailsScreen';
import { UtxosScreen } from '../../presentation/screens/wallet/UtxosScreen';
import { WalletDetailsScreen } from '../../presentation/screens/wallet/WalletDetailsScreen';
import type { AppStackParamList } from './routes';
import { AppRoutes } from './routes';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={AppRoutes.Home} component={HomeScreen} />
      <Stack.Screen name={AppRoutes.WalletDetails} component={WalletDetailsScreen} />
      <Stack.Screen name={AppRoutes.Receive} component={ReceiveScreen} />
      <Stack.Screen name={AppRoutes.Send} component={SendScreen} />
      <Stack.Screen name={AppRoutes.TransactionDetails} component={TransactionDetailsScreen} />
      <Stack.Screen name={AppRoutes.Utxos} component={UtxosScreen} />
      <Stack.Screen name={AppRoutes.Settings} component={SettingsScreen} />
      <Stack.Screen name={AppRoutes.SecuritySettings} component={SecuritySettingsScreen} />
      <Stack.Screen name={AppRoutes.NetworkSettings} component={NetworkSettingsScreen} />
      <Stack.Screen name={AppRoutes.NodeSettings} component={NodeSettingsScreen} />
      <Stack.Screen name={AppRoutes.BackupSettings} component={BackupSettingsScreen} />
      <Stack.Screen name={AppRoutes.OfflineMode} component={OfflineModeScreen} />
      <Stack.Screen name={AppRoutes.SafeMode} component={SafeModeScreen} />
    </Stack.Navigator>
  );
}
