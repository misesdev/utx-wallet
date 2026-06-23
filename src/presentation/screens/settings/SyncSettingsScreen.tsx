import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useSyncSettings } from '../../hooks/useSyncSettings';
import { useTheme } from '../../hooks/useTheme';
import { AppRoutes } from '../../../app/navigation/routes';
import { MAX_REQUESTS_PER_SECOND, MIN_REQUESTS_PER_SECOND } from '../../../core/domain/entities/SyncSettings';

function StepperButton({
  icon,
  onPress,
  disabled,
  testID,
  theme,
}: {
  icon: 'add' | 'close';
  onPress: () => void;
  disabled: boolean;
  testID: string;
  theme: ReturnType<typeof import('../../hooks/useTheme').useTheme>['theme'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepperBtn,
        {
          backgroundColor: disabled ? theme.colors.surfaceMuted : theme.colors.accent,
          borderRadius: theme.radii.md,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <AppIcon name={icon} size={20} color={disabled ? theme.colors.textMuted : theme.colors.background} />
    </Pressable>
  );
}

export function SyncSettingsScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  const {
    settings,
    isLoading,
    hasPersonalNode,
    canEnableParallelSync,
    setMaxRequestsPerSecond,
    toggleParallelSync,
  } = useSyncSettings();

  const rps = settings.maxRequestsPerSecond;
  const canDecrement = rps > MIN_REQUESTS_PER_SECOND;
  const canIncrement = rps < MAX_REQUESTS_PER_SECOND;

  const parallelLocked = !canEnableParallelSync && !settings.parallelSync;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppIcon name="back" size={24} color={theme.colors.textMuted} />
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>{t('syncSettings.title')}</AppText>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        >
          {/* Info banner */}
          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor: theme.colors.accentMuted,
                borderColor: theme.colors.accent,
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            <View style={[styles.infoIconWrap, { backgroundColor: theme.colors.accent, borderRadius: theme.radii.sm }]}>
              <AppIcon name="info" size={18} color={theme.colors.background} />
            </View>
            <AppText variant="caption" style={[styles.infoText, { color: theme.colors.accent }]}>
              {t('syncSettings.rateLimitInfo')}
            </AppText>
          </View>

          {/* Request rate section */}
          <View style={styles.section}>
            <AppText variant="label" color="muted" style={styles.sectionLabel}>
              {t('syncSettings.sectionRate')}
            </AppText>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.lg,
                },
              ]}
            >
              <View style={styles.rateRow}>
                <View style={styles.rateInfo}>
                  <AppText variant="body" style={styles.rowTitle}>{t('syncSettings.maxRps')}</AppText>
                  <AppText variant="caption" color="muted">{t('syncSettings.maxRpsDesc')}</AppText>
                </View>
                <View style={styles.stepper}>
                  <StepperButton
                    icon="close"
                    onPress={() => setMaxRequestsPerSecond(rps - 1)}
                    disabled={!canDecrement}
                    testID="btn-decrement-rps"
                    theme={theme}
                  />
                  <View style={[styles.stepperValue, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.sm }]}>
                    <AppText variant="body" style={styles.stepperValueText} testID="rps-value">{rps}</AppText>
                  </View>
                  <StepperButton
                    icon="add"
                    onPress={() => setMaxRequestsPerSecond(rps + 1)}
                    disabled={!canIncrement}
                    testID="btn-increment-rps"
                    theme={theme}
                  />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

              <View style={styles.delayRow}>
                <AppText variant="caption" color="muted">{t('syncSettings.requestDelay')}</AppText>
                <AppText variant="caption" style={{ color: theme.colors.accent }} testID="delay-value">
                  {t('syncSettings.delayValue', { ms: Math.floor(1000 / rps) })}
                </AppText>
              </View>
            </View>
          </View>

          {/* Parallel sync section */}
          <View style={styles.section}>
            <AppText variant="label" color="muted" style={styles.sectionLabel}>
              {t('syncSettings.sectionParallel')}
            </AppText>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.lg,
                },
              ]}
            >
              <View style={styles.parallelRow}>
                <View style={styles.parallelInfo}>
                  <AppText variant="body" style={styles.rowTitle}>{t('syncSettings.parallelSync')}</AppText>
                  <AppText variant="caption" color="muted">{t('syncSettings.parallelSyncDesc')}</AppText>
                </View>
                <Switch
                  testID="toggle-parallel-sync"
                  value={settings.parallelSync}
                  onValueChange={toggleParallelSync}
                  disabled={parallelLocked}
                  trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
                />
              </View>

              {parallelLocked && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                  <Pressable
                    accessibilityRole="button"
                    testID="btn-configure-node"
                    onPress={() => navigation.navigate(AppRoutes.ManageNodes)}
                    style={({ pressed }) => [styles.nodeLink, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <AppIcon name="node" size={16} color={theme.colors.textMuted} />
                    <AppText variant="caption" color="muted">{t('syncSettings.requiresPersonalNode')}</AppText>
                    <AppIcon name="chevronRight" size={16} color={theme.colors.textMuted} />
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {/* Warning when parallel is enabled */}
          {settings.parallelSync && hasPersonalNode && (
            <View
              style={[
                styles.warningCard,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <AppIcon name="warning" size={16} color={theme.colors.textMuted} />
              <AppText variant="caption" color="muted" style={styles.warningText}>
                {t('syncSettings.parallelWarning')}
              </AppText>
            </View>
          )}

          {/* General info */}
          <View
            style={[
              styles.descCard,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            <AppText variant="caption" color="muted">{t('syncSettings.info')}</AppText>
          </View>
        </ScrollView>
      )}
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
  headerTitle: {
    flex: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scroll: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Info banner
  infoBanner: {
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  infoIconWrap: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },

  // Section
  section: {
    gap: 8,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Rate row
  rateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rateInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTitle: {
    fontWeight: '600',
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  stepperBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stepperValue: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    minWidth: 44,
    paddingHorizontal: 10,
  },
  stepperValueText: {
    fontWeight: '700',
    textAlign: 'center',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },

  delayRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Parallel row
  parallelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  parallelInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  nodeLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Warning card
  warningCard: {
    alignItems: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  warningText: {
    flex: 1,
  },

  // Desc card
  descCard: {
    borderWidth: 1,
    padding: 14,
  },
});
