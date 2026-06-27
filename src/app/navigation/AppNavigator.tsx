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
import { GlobalSettingsScreen } from '../../presentation/screens/settings/GlobalSettingsScreen';
import { NodeSettingsScreen } from '../../presentation/screens/settings/NodeSettingsScreen';
import { ManageNodesScreen } from '../../presentation/screens/settings/ManageNodesScreen';
import { SyncSettingsScreen } from '../../presentation/screens/settings/SyncSettingsScreen';
import { SecuritySettingsScreen } from '../../presentation/screens/settings/SecuritySettingsScreen';
import { LanguageScreen } from '../../presentation/screens/settings/LanguageScreen';
import { SettingsScreen } from '../../presentation/screens/settings/SettingsScreen';
import { ExportWalletFormatScreen } from '../../presentation/screens/settings/ExportWalletFormatScreen';
import { ExportWalletKeyScreen } from '../../presentation/screens/settings/ExportWalletKeyScreen';
import { DonationScreen } from '../../presentation/screens/donation/DonationScreen';
import { AccountDetailsScreen } from '../../presentation/screens/wallet/AccountDetailsScreen';
import { AddressesScreen } from '../../presentation/screens/wallet/AddressesScreen';
import { ReceiveScreen } from '../../presentation/screens/wallet/ReceiveScreen';
import { SegregationScreen } from '../../presentation/screens/wallet/SegregationScreen';
import { SelectOriginReceiveScreen } from '../../presentation/screens/wallet/SelectOriginReceiveScreen';
import { SelectOriginSendScreen } from '../../presentation/screens/wallet/SelectOriginSendScreen';
import { SendScreen } from '../../presentation/screens/wallet/SendScreen';
import { SendFeesScreen } from '../../presentation/screens/wallet/SendFeesScreen';
import { TransactionReviewScreen } from '../../presentation/screens/wallet/TransactionReviewScreen';
import { AccelerateTransactionScreen } from '../../presentation/screens/wallet/AccelerateTransactionScreen';
import { TransactionDetailsScreen } from '../../presentation/screens/wallet/TransactionDetailsScreen';
import { TransactionListScreen } from '../../presentation/screens/wallet/TransactionListScreen';
import { TransactionSuccessScreen } from '../../presentation/screens/wallet/TransactionSuccessScreen';
import { UtxosScreen } from '../../presentation/screens/wallet/UtxosScreen';
import { ViewSeedScreen } from '../../presentation/screens/wallet/ViewSeedScreen';
import { WalletDetailsScreen } from '../../presentation/screens/wallet/WalletDetailsScreen';
import { WalletScreen } from '../../presentation/screens/wallet/WalletScreen';
import { ConfirmQrWalletImportScreen } from '../../presentation/screens/qr/ConfirmQrWalletImportScreen';
import { QrWalletScannerScreen } from '../../presentation/screens/qr/QrWalletScannerScreen';
import { ScanAddressQrScreen } from '../../presentation/screens/qr/ScanAddressQrScreen';
import { NodeTutorialScreen } from '../../presentation/screens/info/NodeTutorialScreen';
import { WalletPolicyScreen } from '../../presentation/screens/info/WalletPolicyScreen';
import { AddressPolicyScreen } from '../../presentation/screens/info/AddressPolicyScreen';
import { AccountPolicyScreen } from '../../presentation/screens/info/AccountPolicyScreen';
import { SignatureMenuScreen } from '../../presentation/screens/signature/SignatureMenuScreen';
import { SignContentScreen } from '../../presentation/screens/signature/SignContentScreen';
import { SignatureResultScreen } from '../../presentation/screens/signature/SignatureResultScreen';
import { VerifySignatureScreen } from '../../presentation/screens/signature/VerifySignatureScreen';
import { ScanTextQrScreen } from '../../presentation/screens/qr/ScanTextQrScreen';
import type { AppStackParamList } from './routes';
import { AppRoutes } from './routes';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <CreateWalletProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name={AppRoutes.Home} component={HomeScreen} />
        <Stack.Screen name={AppRoutes.Wallet} component={WalletScreen} />
        <Stack.Screen name={AppRoutes.CreateWallet} component={CreateWalletScreen} />
        <Stack.Screen name={AppRoutes.ImportWallet} component={ImportWalletScreen} />
        <Stack.Screen name={AppRoutes.BackupSeed} component={BackupSeedScreen} />
        <Stack.Screen name={AppRoutes.ConfirmSeed} component={ConfirmSeedScreen} />
        <Stack.Screen name={AppRoutes.WalletDetails} component={WalletDetailsScreen} />
        <Stack.Screen name={AppRoutes.Transactions} component={TransactionListScreen} />
        <Stack.Screen name={AppRoutes.Receive} component={ReceiveScreen} />
        <Stack.Screen name={AppRoutes.SelectOriginReceive} component={SelectOriginReceiveScreen} />
        <Stack.Screen name={AppRoutes.SelectOriginSend} component={SelectOriginSendScreen} />
        <Stack.Screen name={AppRoutes.Send} component={SendScreen} />
        <Stack.Screen name={AppRoutes.SendFees} component={SendFeesScreen} />
        <Stack.Screen name={AppRoutes.TransactionReview} component={TransactionReviewScreen} />
        <Stack.Screen name={AppRoutes.TransactionDetails} component={TransactionDetailsScreen} />
        <Stack.Screen name={AppRoutes.TransactionSuccess} component={TransactionSuccessScreen} />
        <Stack.Screen name={AppRoutes.AccelerateTransaction} component={AccelerateTransactionScreen} />
        <Stack.Screen name={AppRoutes.Utxos} component={UtxosScreen} />
        <Stack.Screen name={AppRoutes.Addresses} component={AddressesScreen} />
        <Stack.Screen name={AppRoutes.AccountDetails} component={AccountDetailsScreen} />
        <Stack.Screen name={AppRoutes.Segregation} component={SegregationScreen} />
        <Stack.Screen name={AppRoutes.Settings} component={SettingsScreen} />
        <Stack.Screen name={AppRoutes.ViewSeed} component={ViewSeedScreen} />
        <Stack.Screen name={AppRoutes.SecuritySettings} component={SecuritySettingsScreen} />
        <Stack.Screen name={AppRoutes.NodeSettings} component={NodeSettingsScreen} />
        <Stack.Screen name={AppRoutes.NodeTutorial} component={NodeTutorialScreen} />
        <Stack.Screen name={AppRoutes.ManageNodes} component={ManageNodesScreen} />
        <Stack.Screen name={AppRoutes.SyncSettings} component={SyncSettingsScreen} />
        <Stack.Screen name={AppRoutes.BackupSettings} component={BackupSettingsScreen} />
        <Stack.Screen name={AppRoutes.OfflineMode} component={OfflineModeScreen} />
        <Stack.Screen name={AppRoutes.SafeMode} component={SafeModeScreen} />
        <Stack.Screen name={AppRoutes.LanguageSettings} component={LanguageScreen} />
        <Stack.Screen name={AppRoutes.GlobalSettings} component={GlobalSettingsScreen} />
        <Stack.Screen name={AppRoutes.Donation} component={DonationScreen} />
        <Stack.Screen name={AppRoutes.ScanWalletQr} component={QrWalletScannerScreen} />
        <Stack.Screen name={AppRoutes.ScanAddressQr} component={ScanAddressQrScreen} />
        <Stack.Screen name={AppRoutes.ConfirmQrWalletImport} component={ConfirmQrWalletImportScreen} />
        <Stack.Screen name={AppRoutes.WalletPolicy} component={WalletPolicyScreen} />
        <Stack.Screen name={AppRoutes.AddressPolicy} component={AddressPolicyScreen} />
        <Stack.Screen name={AppRoutes.AccountPolicy} component={AccountPolicyScreen} />
        <Stack.Screen name={AppRoutes.ExportWalletFormat} component={ExportWalletFormatScreen} />
        <Stack.Screen name={AppRoutes.ExportWalletKey} component={ExportWalletKeyScreen} />
        <Stack.Screen name={AppRoutes.SignatureMenu} component={SignatureMenuScreen} />
        <Stack.Screen name={AppRoutes.SignContent} component={SignContentScreen} />
        <Stack.Screen name={AppRoutes.SignatureResult} component={SignatureResultScreen} />
        <Stack.Screen name={AppRoutes.VerifySignature} component={VerifySignatureScreen} />
        <Stack.Screen name={AppRoutes.ScanTextQr} component={ScanTextQrScreen} />
      </Stack.Navigator>
    </CreateWalletProvider>
  );
}
