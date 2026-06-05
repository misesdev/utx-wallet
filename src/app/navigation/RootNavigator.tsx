import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationLightTheme } from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';
import { useTheme } from '../../presentation/hooks/useTheme';
import { useWallet } from '../../presentation/hooks/useWallet';
import { LoadingScreen } from '../../presentation/screens/LoadingScreen';

enableScreens();

export function RootNavigator() {
  const { theme } = useTheme();
  const { wallets, isLoading } = useWallet();
  const navigationTheme = theme.mode === 'dark' ? NavigationDarkTheme : NavigationLightTheme;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      theme={{
        ...navigationTheme,
        colors: {
          ...navigationTheme.colors,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          primary: theme.colors.primary,
        },
      }}
    >
      {wallets.length > 0 ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
