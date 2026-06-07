import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CreateWalletProvider } from '../providers/CreateWalletProvider';
import { BackupSeedScreen } from '../../presentation/screens/auth/BackupSeedScreen';
import { ConfirmSeedScreen } from '../../presentation/screens/auth/ConfirmSeedScreen';
import { CreateWalletScreen } from '../../presentation/screens/auth/CreateWalletScreen';
import { ImportWalletScreen } from '../../presentation/screens/auth/ImportWalletScreen';
import { HomeScreen } from '../../presentation/screens/home/HomeScreen';
import { OfflineModeScreen } from '../../presentation/screens/offline/OfflineModeScreen';
import { SafeModeScreen } from '../../presentation/screens/safe-mode/SafeModeScreen';
import { BackupSettingsScreen } from '../../presentation/screens/settings/BackupSettingsScreen';
import { NetworkSettingsScreen } from '../../presentation/screens/settings/NetworkSettingsScreen';
import { NodeSettingsScreen } from '../../presentation/screens/settings/NodeSettingsScreen';
import { SecuritySettingsScreen } from '../../presentation/screens/settings/SecuritySettingsScreen';
import { LanguageScreen } from '../../presentation/screens/settings/LanguageScreen';
import { SettingsScreen } from '../../presentation/screens/settings/SettingsScreen';
import { AddressesScreen } from '../../presentation/screens/wallet/AddressesScreen';
import { ReceiveScreen } from '../../presentation/screens/wallet/ReceiveScreen';
import { SegregationScreen } from '../../presentation/screens/wallet/SegregationScreen';
import { SelectOriginReceiveScreen } from '../../presentation/screens/wallet/SelectOriginReceiveScreen';
import { SelectOriginSendScreen } from '../../presentation/screens/wallet/SelectOriginSendScreen';
import { SendScreen } from '../../presentation/screens/wallet/SendScreen';
import { SendFeesScreen } from '../../presentation/screens/wallet/SendFeesScreen';
import { TransactionDetailsScreen } from '../../presentation/screens/wallet/TransactionDetailsScreen';
import { TransactionListScreen } from '../../presentation/screens/wallet/TransactionListScreen';
import { TransactionSuccessScreen } from '../../presentation/screens/wallet/TransactionSuccessScreen';
import { UtxosScreen } from '../../presentation/screens/wallet/UtxosScreen';
import { WalletDetailsScreen } from '../../presentation/screens/wallet/WalletDetailsScreen';
import { WalletListScreen } from '../../presentation/screens/wallet/WalletListScreen';
import type { AppStackParamList } from './routes';
import { AppRoutes } from './routes';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <CreateWalletProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name={AppRoutes.WalletList} component={WalletListScreen} />
        <Stack.Screen name={AppRoutes.CreateWallet} component={CreateWalletScreen} />
        <Stack.Screen name={AppRoutes.ImportWallet} component={ImportWalletScreen} />
        <Stack.Screen name={AppRoutes.BackupSeed} component={BackupSeedScreen} />
        <Stack.Screen name={AppRoutes.ConfirmSeed} component={ConfirmSeedScreen} />
        <Stack.Screen name={AppRoutes.Home} component={HomeScreen} />
        <Stack.Screen name={AppRoutes.WalletDetails} component={WalletDetailsScreen} />
        <Stack.Screen name={AppRoutes.Transactions} component={TransactionListScreen} />
        <Stack.Screen name={AppRoutes.Receive} component={ReceiveScreen} />
        <Stack.Screen name={AppRoutes.SelectOriginReceive} component={SelectOriginReceiveScreen} />
        <Stack.Screen name={AppRoutes.SelectOriginSend} component={SelectOriginSendScreen} />
        <Stack.Screen name={AppRoutes.Send} component={SendScreen} />
        <Stack.Screen name={AppRoutes.SendFees} component={SendFeesScreen} />
        <Stack.Screen name={AppRoutes.TransactionDetails} component={TransactionDetailsScreen} />
        <Stack.Screen name={AppRoutes.TransactionSuccess} component={TransactionSuccessScreen} />
        <Stack.Screen name={AppRoutes.Utxos} component={UtxosScreen} />
        <Stack.Screen name={AppRoutes.Addresses} component={AddressesScreen} />
        <Stack.Screen name={AppRoutes.Segregation} component={SegregationScreen} />
        <Stack.Screen name={AppRoutes.Settings} component={SettingsScreen} />
        <Stack.Screen name={AppRoutes.SecuritySettings} component={SecuritySettingsScreen} />
        <Stack.Screen name={AppRoutes.NetworkSettings} component={NetworkSettingsScreen} />
        <Stack.Screen name={AppRoutes.NodeSettings} component={NodeSettingsScreen} />
        <Stack.Screen name={AppRoutes.BackupSettings} component={BackupSettingsScreen} />
        <Stack.Screen name={AppRoutes.OfflineMode} component={OfflineModeScreen} />
        <Stack.Screen name={AppRoutes.SafeMode} component={SafeModeScreen} />
        <Stack.Screen name={AppRoutes.LanguageSettings} component={LanguageScreen} />
      </Stack.Navigator>
    </CreateWalletProvider>
  );
}
