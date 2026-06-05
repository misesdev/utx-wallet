import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './providers/AppProvider';
import { RootNavigator } from './navigation/RootNavigator';
import { useTheme } from '../presentation/hooks/useTheme';

function AppStatusBar() {
  const { theme } = useTheme();
  return <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppStatusBar />
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
