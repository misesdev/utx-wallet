import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BackupSeedScreen } from '../../presentation/screens/auth/BackupSeedScreen';
import { ConfirmSeedScreen } from '../../presentation/screens/auth/ConfirmSeedScreen';
import { CreateWalletScreen } from '../../presentation/screens/auth/CreateWalletScreen';
import { ImportWalletScreen } from '../../presentation/screens/auth/ImportWalletScreen';
import { WelcomeScreen } from '../../presentation/screens/auth/WelcomeScreen';
import type { AuthStackParamList } from './routes';
import { AuthRoutes } from './routes';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={AuthRoutes.Welcome} component={WelcomeScreen} />
      <Stack.Screen name={AuthRoutes.CreateWallet} component={CreateWalletScreen} />
      <Stack.Screen name={AuthRoutes.ImportWallet} component={ImportWalletScreen} />
      <Stack.Screen name={AuthRoutes.BackupSeed} component={BackupSeedScreen} />
      <Stack.Screen name={AuthRoutes.ConfirmSeed} component={ConfirmSeedScreen} />
    </Stack.Navigator>
  );
}
