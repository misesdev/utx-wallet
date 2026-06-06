import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/base/AppButton';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { FormInput } from '../../components/forms/FormInput';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useImportWallet } from '../../hooks/useImportWallet';
import { useTheme } from '../../hooks/useTheme';
import type { BitcoinNetwork } from '../../../core/domain/entities/Network';

const IMPORT_NETWORKS: BitcoinNetwork[] = ['mainnet', 'testnet3', 'testnet4'];

export function ImportWalletScreen() {
  const navigation = useAppNavigation();
  const { theme } = useTheme();
  const {
    walletName,
    setWalletName,
    seed,
    setSeed,
    selectedNetwork,
    setSelectedNetwork,
    isLoading,
    error,
    clearError,
    submit,
  } = useImportWallet();

  async function handleImport() {
    const wallet = await submit();
    if (wallet) {
      navigation.goBack();
    }
  }

  return (
    <AppScreen title="Import wallet" subtitle="Enter your seed phrase to restore a wallet">
      <FormInput
        label="Wallet name"
        placeholder="e.g. Savings"
        value={walletName}
        onChangeText={v => {
          setWalletName(v);
          if (error) clearError();
        }}
        autoFocus
        returnKeyType="next"
        maxLength={48}
      />

      <FormInput
        label="Seed phrase"
        placeholder="Enter your 12 or 24 word seed phrase"
        value={seed}
        onChangeText={v => {
          setSeed(v);
          if (error) clearError();
        }}
        multiline
        numberOfLines={5}
        style={styles.seedInput}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="done"
      />

      <View style={styles.networkSection}>
        <AppText variant="label" color="muted">Network</AppText>
        <View style={styles.networkRow}>
          {IMPORT_NETWORKS.map(net => {
            const active = selectedNetwork === net;
            const networkChipStyle = {
              borderColor: active ? theme.colors.primary : theme.colors.border,
              backgroundColor: active ? theme.colors.primary + '1A' : 'transparent',
              borderRadius: theme.radii.md,
            };
            const networkLabelStyle = {
              color: active ? theme.colors.primary : theme.colors.textMuted,
            };
            return (
              <Pressable
                key={net}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedNetwork(net)}
                style={[
                  styles.networkChip,
                  networkChipStyle,
                ]}
              >
                <AppText
                  variant="label"
                  style={networkLabelStyle}
                >
                  {net}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? (
        <AppText variant="caption" color="danger">{error}</AppText>
      ) : null}

      <AppButton
        title="Import wallet"
        onPress={handleImport}
        disabled={isLoading}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  seedInput: {
    height: undefined,
    minHeight: 120,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: 'top',
  },
  networkSection: {
    gap: 8,
  },
  networkRow: {
    flexDirection: 'row',
    gap: 8,
  },
  networkChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
  },
});
