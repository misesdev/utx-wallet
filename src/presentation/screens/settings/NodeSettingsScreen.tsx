import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUPPORTED_NETWORKS } from '../../../shared/constants/networks';
import type { BitcoinNetwork } from '../../../core/domain/entities/Network';
import { AppButton } from '../../components/base/AppButton';
import { AppInput } from '../../components/base/AppInput';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useTheme } from '../../hooks/useTheme';
import { useSafeMode } from '../../hooks/useSafeMode';

export function NodeSettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  const {
    form,
    statusLabel,
    setUrl,
    setPort,
    setAuthToken,
    setNetwork,
    testConnection,
    activateSafeMode,
  } = useSafeMode();

  const statusColor = statusLabel === 'conectado' ? theme.colors.success : theme.colors.textMuted;

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
          <AppText variant="subtitle" style={styles.headerTitle}>Node settings</AppText>
          <AppText variant="caption" color="muted">Personal node connection</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Connection inputs */}
        <View style={styles.section}>
          <AppText variant="label" color="muted" style={styles.sectionLabel}>Conexão</AppText>
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            <View style={styles.inputGroup}>
              <AppText variant="caption" color="muted" style={styles.inputLabel}>URL do node</AppText>
              <AppInput
                accessibilityLabel="Node URL"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://node.example.com/api"
                value={form.url}
                onChangeText={setUrl}
              />
            </View>
            <View style={[styles.inputDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.inputGroup}>
              <AppText variant="caption" color="muted" style={styles.inputLabel}>Porta</AppText>
              <AppInput
                accessibilityLabel="Node port"
                keyboardType="number-pad"
                placeholder="Porta"
                value={form.port}
                onChangeText={setPort}
              />
            </View>
            <View style={[styles.inputDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.inputGroup}>
              <AppText variant="caption" color="muted" style={styles.inputLabel}>Token de autenticação</AppText>
              <AppInput
                accessibilityLabel="Node auth token"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Token de autenticação"
                secureTextEntry
                value={form.authToken}
                onChangeText={setAuthToken}
              />
            </View>
          </View>
        </View>

        {/* Network selector */}
        <View style={styles.section}>
          <AppText variant="label" color="muted" style={styles.sectionLabel}>Rede</AppText>
          <View style={styles.networkGrid}>
            {SUPPORTED_NETWORKS.map(network => {
              const isSelected = form.network === network;
              return (
                <Pressable
                  key={network}
                  onPress={() => setNetwork(network as BitcoinNetwork)}
                  style={({ pressed }) => [
                    styles.networkChip,
                    {
                      backgroundColor: isSelected ? theme.colors.accentMuted : theme.colors.surfaceRaised,
                      borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      borderRadius: theme.radii.md,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={isSelected ? [styles.chipSelected, { color: theme.colors.accent }] : undefined}
                  >
                    {network}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Connection status */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
            },
          ]}
        >
          <AppText variant="label" color="muted">Status</AppText>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <AppText variant="body" style={{ color: statusColor }}>{statusLabel}</AppText>
          </View>
        </View>

        {/* Actions */}
        <AppButton title="Testar conexão" variant="secondary" onPress={testConnection} />
        <AppButton title="Salvar e ativar modo seguro" onPress={activateSafeMode} />
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

  // Sections
  section: {
    gap: 10,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    marginLeft: 2,
  },

  // Form card
  formCard: {
    borderWidth: 1,
    gap: 0,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  inputGroup: {
    gap: 4,
    paddingVertical: 8,
  },
  inputLabel: {
    letterSpacing: 0.5,
  },
  inputDivider: {
    height: StyleSheet.hairlineWidth,
  },

  // Network
  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  networkChip: {
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 110,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  chipSelected: {
    fontWeight: '700',
  },

  // Status
  statusCard: {
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
});
