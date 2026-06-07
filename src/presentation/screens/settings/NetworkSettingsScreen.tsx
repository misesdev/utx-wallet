import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/base/AppButton';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useNetworkSettings } from '../../hooks/useNetworkSettings';
import { useTheme } from '../../hooks/useTheme';

export function NetworkSettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  const {
    activeNetwork,
    pendingNetwork,
    options,
    warning,
    error,
    isSaving,
    selectNetwork,
    confirmNetworkChange,
  } = useNetworkSettings();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppText variant="title" color="muted">←</AppText>
        </Pressable>
        <View style={styles.headerCenter}>
          <AppText variant="subtitle" style={styles.headerTitle}>Network settings</AppText>
          <AppText variant="caption" color="muted">Choose the active Bitcoin network</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Active network card */}
        <View
          style={[
            styles.activeCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.borderHighlight,
              borderRadius: theme.radii.lg,
            },
          ]}
        >
          <AppText variant="label" color="muted" style={styles.cardLabel}>Rede ativa</AppText>
          <View style={styles.activeRow}>
            <View style={[styles.activeDot, { backgroundColor: theme.colors.success }]} />
            <AppText variant="subtitle" style={styles.activeText}>{activeNetwork}</AppText>
          </View>
        </View>

        {/* Network selector */}
        <View style={styles.section}>
          <AppText variant="label" color="muted" style={styles.sectionLabel}>Selecionar rede</AppText>
          <View style={styles.networkGrid}>
            {options.map(option => {
              const isSelected = pendingNetwork === option.network;
              const isDisabled = !option.isWalletCompatible;
              return (
                <Pressable
                  key={option.network}
                  onPress={() => !isDisabled && selectNetwork(option.network)}
                  disabled={isDisabled}
                  style={({ pressed }) => [
                    styles.networkChip,
                    {
                      backgroundColor: isSelected ? theme.colors.accentMuted : theme.colors.surfaceRaised,
                      borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      borderRadius: theme.radii.md,
                      opacity: isDisabled ? 0.4 : pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={isSelected ? [styles.chipSelected, { color: theme.colors.accent }] : undefined}
                  >
                    {option.network}
                  </AppText>
                  {isSelected && <View style={[styles.selectedDot, { backgroundColor: theme.colors.accent }]} />}
                </Pressable>
              );
            })}
          </View>
          <AppText variant="caption" color="muted" style={styles.hintText}>
            Redes incompatíveis com a carteira atual ficam bloqueadas.
          </AppText>
        </View>

        {/* Warning */}
        {warning ? (
          <View
            style={[
              styles.alertCard,
              {
                backgroundColor: theme.colors.warningMuted ?? theme.colors.surfaceMuted,
                borderColor: theme.colors.warning,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            <AppText variant="body" style={[styles.alertTitle, { color: theme.colors.warning }]}>Atenção</AppText>
            <AppText variant="caption" color="muted">{warning}</AppText>
          </View>
        ) : null}

        {/* Error */}
        {error ? (
          <View
            style={[
              styles.alertCard,
              {
                backgroundColor: theme.colors.dangerMuted,
                borderColor: theme.colors.danger,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            <AppText variant="body" style={[styles.alertTitle, { color: theme.colors.danger }]}>Rede incompatível</AppText>
            <AppText variant="caption" color="muted">{error}</AppText>
          </View>
        ) : null}

        {/* Apply button */}
        <AppButton
          title={isSaving ? 'Salvando...' : 'Aplicar rede'}
          disabled={isSaving || activeNetwork === pendingNetwork}
          onPress={confirmNetworkChange}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontWeight: '700',
  },
  scroll: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Active network card
  activeCard: {
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  cardLabel: {
    letterSpacing: 1.5,
  },
  activeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  activeDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  activeText: {
    fontWeight: '700',
  },

  // Network selector
  section: {
    gap: 12,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    marginLeft: 2,
  },
  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  networkChip: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 110,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedDot: {
    borderRadius: 4,
    height: 7,
    marginLeft: 'auto',
    width: 7,
  },
  hintText: {
    lineHeight: 18,
    marginLeft: 2,
  },

  // Alert cards
  alertCard: {
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  alertTitle: {
    fontWeight: '700',
  },
  chipSelected: {
    fontWeight: '700',
  },
});
