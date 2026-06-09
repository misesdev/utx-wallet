import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { SUPPORTED_NETWORKS } from '../../../shared/constants/networks';
import type { BitcoinNetwork, NodeConnectionStatus } from '../../../core/domain/entities/Network';
import type { PersonalNode } from '../../../core/domain/entities/PersonalNode';
import { AppButton } from '../../components/base/AppButton';
import { AppInput } from '../../components/base/AppInput';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { usePersonalNodes } from '../../hooks/usePersonalNodes';
import { useNetwork } from '../../hooks/useNetwork';
import { useTheme } from '../../hooks/useTheme';
import type { AppStackParamList } from '../../../app/navigation/routes';
import type { RouteProp } from '@react-navigation/native';
import { DEFAULT_NETWORK } from '../../../shared/constants/networks';

type NodeSettingsRoute = RouteProp<AppStackParamList, 'NodeSettings'>;

export function NodeSettingsScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const route = useRoute<NodeSettingsRoute>();

  const { networkConfig } = useNetwork();
  const { nodes, addNode, updateNode, testNode } = usePersonalNodes();

  const editingNode = route.params?.nodeId
    ? nodes.find(n => n.id === route.params!.nodeId)
    : undefined;

  const [label, setLabel] = useState(editingNode?.label ?? '');
  const [url, setUrl] = useState(editingNode?.url ?? '');
  const [port, setPort] = useState(editingNode?.port ? String(editingNode.port) : '');
  const [authToken, setAuthToken] = useState(editingNode?.authToken ?? '');
  const [network, setNetwork] = useState<BitcoinNetwork>(
    editingNode?.network ?? networkConfig.network ?? DEFAULT_NETWORK,
  );
  const [status, setStatus] = useState<NodeConnectionStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleUrlChange(v: string) { setUrl(v); setStatus(null); }
  function handlePortChange(v: string) { setPort(v); setStatus(null); }
  function handleAuthTokenChange(v: string) { setAuthToken(v); setStatus(null); }
  function handleNetworkChange(v: BitcoinNetwork) { setNetwork(v); setStatus(null); }

  const isEditing = !!editingNode;
  const connectionFieldsFilled = label.trim().length > 0 && url.trim().length > 0;
  const canSave = connectionFieldsFilled && status === 'connected';

  function buildNode(): Omit<PersonalNode, 'id'> {
    const parsedPort = parseInt(port, 10);
    return {
      label: label.trim(),
      url: url.trim(),
      port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : undefined,
      authToken: authToken.trim() || undefined,
      network,
      priority: editingNode?.priority ?? (nodes.length + 1),
    };
  }

  async function handleTestConnection() {
    setIsTesting(true);
    setStatus(null);
    try {
      const parsedPort = parseInt(port, 10);
      const testableNode: PersonalNode = {
        id: editingNode?.id ?? '__test__',
        label: label.trim(),
        url: url.trim(),
        port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : undefined,
        authToken: authToken.trim() || undefined,
        network,
        priority: 1,
      };
      const result = await testNode(testableNode);
      setStatus(result);
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEditing && editingNode) {
        await updateNode({ ...editingNode, ...buildNode() });
      } else {
        await addNode(buildNode());
      }
      navigation.goBack();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('nodeSettings.saveError'));
    } finally {
      setIsSaving(false);
    }
  }

  const statusColor = status === 'connected'
    ? theme.colors.success
    : status !== null
      ? theme.colors.danger
      : theme.colors.textMuted;

  const statusBorderColor = status === 'connected'
    ? theme.colors.success + '55'
    : status !== null
      ? theme.colors.danger + '55'
      : theme.colors.border;

  const statusText = status
    ? t(`nodeSettings.status_${status}`)
    : t('nodeSettings.statusNotTested');

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
        <View style={styles.headerCenter}>
          <AppText variant="subtitle" style={styles.headerTitle}>
            {isEditing ? t('nodeSettings.titleEdit') : t('nodeSettings.title')}
          </AppText>
          <AppText variant="caption" color="muted">{t('nodeSettings.subtitle')}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nodeTutorial.title')}
          onPress={() => navigation.navigate('NodeTutorial')}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          testID="btn-node-tutorial"
        >
          <AppIcon name="info" size={22} color={theme.colors.accent} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 80 }]}
      >
        {/* Connection inputs */}
        <View style={styles.section}>
          <AppText variant="label" color="muted" style={styles.sectionLabel}>{t('nodeSettings.connection')}</AppText>
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
              <AppText variant="caption" color="muted" style={styles.inputLabel}>{t('nodeSettings.label')}</AppText>
              <AppInput
                accessibilityLabel={t('nodeSettings.label')}
                autoCapitalize="words"
                placeholder={t('nodeSettings.labelPlaceholder')}
                value={label}
                onChangeText={setLabel}
                testID="input-label"
              />
            </View>
            <View style={[styles.inputDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.inputGroup}>
              <AppText variant="caption" color="muted" style={styles.inputLabel}>{t('nodeSettings.nodeUrl')}</AppText>
              <AppInput
                accessibilityLabel={t('nodeSettings.nodeUrl')}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder={t('nodeSettings.nodeUrlPlaceholder')}
                value={url}
                onChangeText={handleUrlChange}
                testID="input-url"
              />
            </View>
            <View style={[styles.inputDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.inputGroup}>
              <AppText variant="caption" color="muted" style={styles.inputLabel}>{t('nodeSettings.port')}</AppText>
              <AppInput
                accessibilityLabel={t('nodeSettings.port')}
                keyboardType="number-pad"
                placeholder={t('nodeSettings.portPlaceholder')}
                value={port}
                onChangeText={handlePortChange}
                testID="input-port"
              />
            </View>
            <View style={[styles.inputDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.inputGroup}>
              <AppText variant="caption" color="muted" style={styles.inputLabel}>{t('nodeSettings.authToken')}</AppText>
              <AppInput
                accessibilityLabel={t('nodeSettings.authToken')}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('nodeSettings.authTokenPlaceholder')}
                secureTextEntry
                value={authToken}
                onChangeText={handleAuthTokenChange}
                testID="input-auth-token"
              />
            </View>
          </View>
        </View>

        {/* Network selector */}
        <View style={styles.section}>
          <AppText variant="label" color="muted" style={styles.sectionLabel}>{t('common.network')}</AppText>
          <View style={styles.networkGrid}>
            {SUPPORTED_NETWORKS.map(n => {
              const isSelected = network === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => handleNetworkChange(n as BitcoinNetwork)}
                  style={({ pressed }) => [
                    styles.networkChip,
                    {
                      backgroundColor: isSelected ? theme.colors.accentMuted : theme.colors.surfaceRaised,
                      borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      borderRadius: theme.radii.md,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                  testID={`network-chip-${n}`}
                >
                  <AppText
                    variant="body"
                    style={isSelected ? [styles.chipSelected, { color: theme.colors.accent }] : undefined}
                  >
                    {n}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Connection status — always visible */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: statusBorderColor,
              borderRadius: theme.radii.lg,
            },
          ]}
          testID="status-card"
        >
          <AppText variant="label" color="muted">{t('nodeSettings.status')}</AppText>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <AppText variant="body" style={{ color: statusColor }} testID="status-text">{statusText}</AppText>
          </View>
          {connectionFieldsFilled && status !== 'connected' && !isTesting && (
            <AppText variant="caption" color="muted" testID="test-required-hint">
              {t('nodeSettings.testRequired')}
            </AppText>
          )}
        </View>

        {saveError && (
          <AppText variant="caption" color="danger" testID="save-error">{saveError}</AppText>
        )}

        {/* Actions */}
        <AppButton
          title={isTesting ? t('nodeSettings.testing') : t('nodeSettings.testConnection')}
          variant="secondary"
          onPress={handleTestConnection}
          loading={isTesting}
          disabled={!url.trim() || isTesting}
          testID="btn-test-connection"
        />
        <AppButton
          title={isEditing ? t('nodeSettings.saveChanges') : t('nodeSettings.saveAndAdd')}
          onPress={handleSave}
          loading={isSaving}
          disabled={!canSave || isSaving}
          testID="btn-save"
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
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
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
