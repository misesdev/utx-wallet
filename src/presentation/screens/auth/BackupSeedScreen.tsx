import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { NoopScreenCaptureAdapter } from '../../../core/infrastructure/adapters/ScreenCaptureAdapter';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { SeedGrid } from '../../components/wallet/SeedGrid';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useCreateWallet } from '../../hooks/useCreateWallet';
import { AuthRoutes } from '../../../app/navigation/routes';

const screenCaptureGuard = new NoopScreenCaptureAdapter();

export function BackupSeedScreen() {
  const navigation = useAppNavigation();
  const { words, walletName, proceedToConfirm } = useCreateWallet();

  useEffect(() => {
    screenCaptureGuard.enable();
    return () => screenCaptureGuard.disable();
  }, []);

  function handleContinue() {
    proceedToConfirm();
    navigation.navigate(AuthRoutes.ConfirmSeed);
  }

  return (
    <AppScreen title="Back up your seed" subtitle={walletName}>
      <AppCard accent>
        <AppText variant="label" color="accent">
          Keep this private
        </AppText>
        <AppText variant="caption" color="muted">
          Write these 12 words on paper and store them somewhere safe. Anyone with this
          phrase can access your funds.
        </AppText>
      </AppCard>

      <SeedGrid words={words} />

      <View style={styles.warnings}>
        <AppText variant="caption" color="muted">
          • Never share your seed phrase with anyone
        </AppText>
        <AppText variant="caption" color="muted">
          • Never store it digitally or take a screenshot
        </AppText>
        <AppText variant="caption" color="muted">
          • Without this phrase, lost funds cannot be recovered
        </AppText>
      </View>

      <AppButton title="I've written it down" onPress={handleContinue} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  warnings: {
    gap: 6,
    paddingHorizontal: 4,
  },
});
