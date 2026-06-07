import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/base/AppButton';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { PinInputModal } from '../../components/security/PinInputModal';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useSecuritySettings } from '../../hooks/useSecuritySettings';
import { useTheme } from '../../hooks/useTheme';
import { AUTO_LOCK_OPTIONS } from '../../../core/domain/entities/SecuritySettings';
import type { AutoLockSeconds } from '../../../core/domain/entities/SecuritySettings';

type ToggleRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

function ToggleRow({ label, description, value, onToggle, disabled }: ToggleRowProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <AppText variant="body" style={styles.toggleLabel}>{label}</AppText>
        {description ? (
          <AppText variant="caption" color="muted">{description}</AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}

type LockOptionProps = {
  label: string;
  value: AutoLockSeconds;
  selected: boolean;
  onSelect: (v: AutoLockSeconds) => void;
};

function LockOption({ label, value, selected, onSelect }: LockOptionProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      testID={`lock-option-${value}`}
      onPress={() => onSelect(value)}
      style={({ pressed }) => [
        styles.lockOption,
        {
          backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surfaceRaised,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          borderRadius: theme.radii.md,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <AppText variant="body" style={selected ? [styles.lockOptionSelected, { color: theme.colors.accent }] : undefined}>
        {label}
      </AppText>
      <View style={[styles.radioCircle, { borderColor: selected ? theme.colors.accent : theme.colors.border }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: theme.colors.accent }]} />}
      </View>
    </Pressable>
  );
}

type SectionCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

function SectionCard({ title, description, children }: SectionCardProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="subtitle" style={styles.sectionTitle}>{title}</AppText>
        {description ? <AppText variant="caption" color="muted">{description}</AppText> : null}
      </View>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.lg,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function SecuritySettingsScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  const {
    settings,
    biometricAvailable,
    isLoading,
    isSaving,
    error,
    pinModalVisible,
    pinModalStep,
    pinError,
    openPinSetup,
    openPinRemove,
    closePinModal,
    submitPinStep,
    toggleBiometric,
    setAutoLock,
    toggleHideBalance,
    toggleBlockScreenshots,
  } = useSecuritySettings();

  if (isLoading) return null;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppIcon name="back" size={24} color={theme.colors.textMuted} />
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>{t('security.title')}</AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* PIN Section */}
        <SectionCard
          title={t('security.pin')}
          description={t('security.pinDesc')}
        >
          <ToggleRow
            label={t('security.enablePin')}
            description={settings.pinEnabled ? t('security.pinConfigured') : t('security.noPinConfigured')}
            value={settings.pinEnabled}
            onToggle={settings.pinEnabled ? openPinRemove : openPinSetup}
          />
          {settings.pinEnabled && (
            <>
              <View style={[styles.cardDivider, { backgroundColor: theme.colors.border }]} />
              <AppButton
                title={t('security.changePin')}
                variant="ghost"
                size="sm"
                onPress={openPinSetup}
              />
            </>
          )}
        </SectionCard>

        {/* Biometric Section */}
        {biometricAvailable && (
          <SectionCard
            title={t('security.biometrics')}
            description={t('security.biometricsDesc')}
          >
            <ToggleRow
              label={t('security.enableBiometrics')}
              description={settings.pinEnabled ? undefined : t('security.configurePinFirst')}
              value={settings.biometricEnabled}
              onToggle={toggleBiometric}
              disabled={!settings.pinEnabled}
            />
          </SectionCard>
        )}

        {/* Auto-lock Section */}
        <SectionCard
          title={t('security.autoLock')}
          description={t('security.autoLockDesc')}
        >
          <View style={styles.lockGrid}>
            {AUTO_LOCK_OPTIONS.map(opt => (
              <LockOption
                key={opt.value}
                label={opt.label}
                value={opt.value}
                selected={settings.autoLockSeconds === opt.value}
                onSelect={setAutoLock}
              />
            ))}
          </View>
        </SectionCard>

        {/* Privacy Section */}
        <SectionCard
          title={t('security.privacy')}
          description={t('security.privacyDesc')}
        >
          <ToggleRow
            label={t('security.hideBalance')}
            description={t('security.hideBalanceDesc')}
            value={settings.hideBalance}
            onToggle={toggleHideBalance}
          />
          <View style={[styles.cardDivider, { backgroundColor: theme.colors.border }]} />
          <ToggleRow
            label={t('security.blockScreenshots')}
            description={t('security.blockScreenshotsDesc')}
            value={settings.blockScreenshots}
            onToggle={toggleBlockScreenshots}
          />
        </SectionCard>

        {/* Info note */}
        <View
          style={[
            styles.infoNote,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
            },
          ]}
        >
          <AppText variant="caption" color="muted">
            {t('security.footnote')}
          </AppText>
        </View>

        {/* Error */}
        {error ? (
          <AppText variant="caption" color="danger" testID="settings-error">{error}</AppText>
        ) : null}
      </ScrollView>

      <PinInputModal
        visible={pinModalVisible}
        step={pinModalStep}
        error={pinError}
        isSaving={isSaving}
        onSubmit={submitPinStep}
        onCancel={closePinModal}
      />
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
  scroll: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Section
  section: {
    gap: 10,
  },
  sectionHeader: {
    gap: 3,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  sectionCard: {
    borderWidth: 1,
    gap: 0,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },

  // Toggle row
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontWeight: '500',
  },

  // Lock options
  lockOptionSelected: {
    fontWeight: '600',
  },
  lockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  lockOption: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: '46%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  radioCircle: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    height: 16,
    justifyContent: 'center',
    marginLeft: 'auto',
    width: 16,
  },
  radioDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },

  // Info note
  infoNote: {
    borderWidth: 1,
    padding: 14,
  },
});
