import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppButton } from '../../components/base/AppButton';
import { AppCard } from '../../components/base/AppCard';
import { AppScreen } from '../../components/base/AppScreen';
import { AppText } from '../../components/base/AppText';
import { PinInputModal } from '../../components/security/PinInputModal';
import { FormSection } from '../../components/forms/FormSection';
import { useSecuritySettings } from '../../hooks/useSecuritySettings';
import { useTheme } from '../../hooks/useTheme';
import { AUTO_LOCK_OPTIONS } from '../../../core/domain/entities/SecuritySettings';
import type { AutoLockSeconds } from '../../../core/domain/entities/SecuritySettings';

function SettingRow({
  label,
  description,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="body">{label}</AppText>
        {description ? <AppText variant="caption" color="muted">{description}</AppText> : null}
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

function LockOption({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: AutoLockSeconds;
  selected: boolean;
  onSelect: (v: AutoLockSeconds) => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={[styles.lockOption, selected && { backgroundColor: theme.colors.surfaceMuted }]}
      onPress={() => onSelect(value)}
      testID={`lock-option-${value}`}
    >
      <AppText variant="body">{label}</AppText>
      {selected ? (
        <View style={[styles.checkDot, { backgroundColor: theme.colors.primary }]} />
      ) : (
        <View style={[styles.checkDot, styles.unselectedCheckDot, { borderColor: theme.colors.border }]} />
      )}
    </Pressable>
  );
}

export function SecuritySettingsScreen() {
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
    <AppScreen title="Segurança" scrollable>

      <FormSection
        title="PIN"
        description="Bloqueie a carteira com um código PIN numérico"
      >
        <AppCard>
          <SettingRow
            label="Ativar PIN"
            description={settings.pinEnabled ? 'PIN configurado' : 'Sem PIN configurado'}
            value={settings.pinEnabled}
            onToggle={settings.pinEnabled ? openPinRemove : openPinSetup}
          />
        </AppCard>
        {settings.pinEnabled && (
          <AppButton
            title="Alterar PIN"
            variant="secondary"
            size="sm"
            onPress={openPinSetup}
          />
        )}
      </FormSection>

      {biometricAvailable ? (
        <FormSection
          title="Biometria"
          description="Desbloqueie usando digital ou reconhecimento facial"
        >
          <AppCard>
            <SettingRow
              label="Ativar Biometria"
              description={settings.pinEnabled ? undefined : 'Configure um PIN primeiro'}
              value={settings.biometricEnabled}
              onToggle={toggleBiometric}
              disabled={!settings.pinEnabled}
            />
          </AppCard>
        </FormSection>
      ) : null}

      <FormSection
        title="Bloqueio Automático"
        description="Tempo de inatividade antes de bloquear a carteira"
      >
        <AppCard>
          {AUTO_LOCK_OPTIONS.map(opt => (
            <LockOption
              key={opt.value}
              label={opt.label}
              value={opt.value}
              selected={settings.autoLockSeconds === opt.value}
              onSelect={setAutoLock}
            />
          ))}
        </AppCard>
      </FormSection>

      <FormSection
        title="Privacidade"
        description="Proteções adicionais de privacidade"
      >
        <AppCard>
          <SettingRow
            label="Ocultar Saldo"
            description="Exibe asteriscos no lugar do saldo"
            value={settings.hideBalance}
            onToggle={toggleHideBalance}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Bloquear Screenshots"
            description="Impede capturas de tela em telas sensíveis"
            value={settings.blockScreenshots}
            onToggle={toggleBlockScreenshots}
          />
        </AppCard>
      </FormSection>

      <AppCard>
        <AppText variant="caption" color="muted">
          PIN ou biometria serão solicitados antes de visualizar a seed, enviar bitcoin e exportar dados sensíveis.
        </AppText>
      </AppCard>

      {error ? (
        <AppText variant="caption" color="danger" testID="settings-error">
          {error}
        </AppText>
      ) : null}

      <PinInputModal
        visible={pinModalVisible}
        step={pinModalStep}
        error={pinError}
        isSaving={isSaving}
        onSubmit={submitPinStep}
        onCancel={closePinModal}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  lockOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  checkDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  unselectedCheckDot: {
    borderWidth: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 8,
  },
});
