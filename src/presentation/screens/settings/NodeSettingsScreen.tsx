import React, { Fragment, useState } from 'react';
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

  const { nodes, addNode, updateNode, testNode } = usePersonalNodes();

  const editingNode = route.params?.nodeId
    ? nodes.find(n => n.id === route.params!.nodeId)
    : undefined;

  const [label, setLabel] = useState(editingNode?.label ?? '');
  const [url, setUrl] = useState(editingNode?.url ?? '');
  const [network, setNetwork] = useState<BitcoinNetwork>(
    editingNode?.network ?? DEFAULT_NETWORK,
  );
  const [authEnabled, setAuthEnabled] = useState(!!editingNode?.authToken);
  const [authToken, setAuthToken] = useState(editingNode?.authToken ?? '');
  const [showToken, setShowToken] = useState(false);

  const [status, setStatus] = useState<NodeConnectionStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleUrlChange(v: string) { setUrl(v); setStatus(null); }
  function handleNetworkChange(v: BitcoinNetwork) { setNetwork(v); setStatus(null); }
  function handleAuthTokenChange(v: string) { setAuthToken(v); setStatus(null); }

  function handleAuthToggle() {
    const next = !authEnabled;
    setAuthEnabled(next);
    if (!next) setAuthToken('');
    setStatus(null);
  }

  const isEditing = !!editingNode;
  const connectionFieldsFilled = label.trim().length > 0 && url.trim().length > 0;
  const isHttpUrl = url.trim().length > 0 && url.trim().toLowerCase().startsWith('http://');
  const canSave = connectionFieldsFilled && status === 'connected';

  const statusColor =
    status === 'connected'
      ? theme.colors.success
      : status !== null
        ? theme.colors.danger
        : theme.colors.textMuted;

  const statusBgColor =
    status === 'connected'
      ? theme.colors.success + '18'
      : status !== null
        ? theme.colors.danger + '18'
        : theme.colors.surfaceMuted;

  const statusBorderColor =
    status === 'connected'
      ? theme.colors.success + '55'
      : status !== null
        ? theme.colors.danger + '55'
        : theme.colors.border;

  const statusText = status
    ? t(`nodeSettings.status_${status}`)
    : t('nodeSettings.statusNotTested');

  const statusDesc =
    status === 'connected'
      ? t('nodeSettings.statusConnectedDesc')
      : status === 'network-incompatible'
        ? t('nodeSettings.statusNetworkMismatchDesc')
        : status === 'authentication-error'
          ? t('nodeSettings.statusAuthErrorDesc')
          : status === 'disconnected'
            ? t('nodeSettings.statusDisconnectedDesc')
            : t('nodeSettings.statusNotTestedDesc');

  function buildNode(): Omit<PersonalNode, 'id'> {
    return {
      label: label.trim(),
      url: url.trim(),
      authToken: authEnabled && authToken.trim() ? authToken.trim() : undefined,
      network,
      priority: editingNode?.priority ?? (nodes.length + 1),
    };
  }

  async function handleTestConnection() {
    setIsTesting(true);
    setStatus(null);
    try {
      const testableNode: PersonalNode = {
        id: editingNode?.id ?? '__test__',
        label: label.trim(),
        url: url.trim(),
        authToken: authEnabled && authToken.trim() ? authToken.trim() : undefined,
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

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
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
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
          testID="btn-node-tutorial"
        >
          <AppIcon name="info" size={22} color={theme.colors.accent} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {/* Connection card */}
        <View style={styles.section}>
          <AppText variant="label" color="muted" style={styles.sectionLabel}>
            {t('nodeSettings.connection')}
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
            {/* Label */}
            <View style={styles.fieldGroup}>
              <AppText variant="caption" color="muted" style={styles.fieldLabel}>
                {t('nodeSettings.label')}
              </AppText>
              <AppInput
                accessibilityLabel={t('nodeSettings.label')}
                autoCapitalize="words"
                placeholder={t('nodeSettings.labelPlaceholder')}
                value={label}
                onChangeText={setLabel}
                testID="input-label"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {/* URL */}
            <View style={styles.fieldGroup}>
              <AppText variant="caption" color="muted" style={styles.fieldLabel}>
                {t('nodeSettings.nodeUrl')}
              </AppText>
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
              <View
                style={[
                  styles.urlHint,
                  {
                    backgroundColor: theme.colors.accentMuted,
                    borderRadius: theme.radii.sm,
                  },
                ]}
                testID="url-hint"
              >
                <AppIcon name="info" size={13} color={theme.colors.accent} />
                <AppText variant="caption" style={[styles.urlHintText, { color: theme.colors.accent }]}>
                  {t('nodeSettings.urlHint')}
                </AppText>
              </View>
              {isHttpUrl && (
                <View
                  style={[
                    styles.urlHint,
                    {
                      backgroundColor: theme.colors.danger + '18',
                      borderRadius: theme.radii.sm,
                    },
                  ]}
                  testID="http-warning"
                >
                  <AppIcon name="warning" size={13} color={theme.colors.danger} />
                  <AppText variant="caption" style={[styles.urlHintText, { color: theme.colors.danger }]}>
                    {t('nodeSettings.httpNodeWarning')}
                  </AppText>
                </View>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {/* Auth token toggle */}
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: authEnabled }}
              accessibilityLabel={t('nodeSettings.authTokenSection')}
              onPress={handleAuthToggle}
              style={({ pressed }) => [styles.toggleRow, { opacity: pressed ? 0.8 : 1 }]}
              testID="toggle-auth"
            >
              <AppIcon name="safeMode" size={20} color={theme.colors.textMuted} />
              <View style={styles.toggleText}>
                <AppText variant="body" style={styles.toggleLabel}>{t('nodeSettings.authTokenSection')}</AppText>
                <AppText variant="caption" color="muted">{t('nodeSettings.authTokenDesc')}</AppText>
              </View>
              <View
                style={[
                  styles.togglePill,
                  { backgroundColor: authEnabled ? theme.colors.accent : theme.colors.surfaceMuted },
                ]}
              >
                <View style={[styles.toggleThumb, authEnabled ? styles.thumbOn : styles.thumbOff]} />
              </View>
            </Pressable>

            {authEnabled && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.fieldGroup}>
                  <AppText variant="caption" color="muted" style={styles.fieldLabel}>
                    {t('nodeSettings.authToken')}
                  </AppText>
                  <View style={styles.tokenRow}>
                    <AppInput
                      accessibilityLabel={t('nodeSettings.authToken')}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder={t('nodeSettings.authTokenPlaceholder')}
                      secureTextEntry={!showToken}
                      value={authToken}
                      onChangeText={handleAuthTokenChange}
                      testID="input-auth-token"
                      style={styles.tokenInput}
                    />
                    <Pressable
                      onPress={() => setShowToken(p => !p)}
                      style={({ pressed }) => [
                        styles.eyeBtn,
                        {
                          backgroundColor: theme.colors.surfaceMuted,
                          borderColor: theme.colors.border,
                          borderRadius: theme.radii.md,
                          opacity: pressed ? 0.6 : 1,
                        },
                      ]}
                      testID="btn-toggle-token-visibility"
                      accessibilityLabel={showToken ? t('nodeSettings.hideToken') : t('nodeSettings.showToken')}
                    >
                      <AppIcon
                        name={showToken ? 'eyeOff' : 'eye'}
                        size={18}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Network card */}
        <View style={styles.section}>
          <AppText variant="label" color="muted" style={styles.sectionLabel}>
            {t('common.network')}
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
            {SUPPORTED_NETWORKS.map((n, idx) => {
              const isSelected = network === n;
              const isLast = idx === SUPPORTED_NETWORKS.length - 1;
              return (
                <Fragment key={n}>
                  <Pressable
                    onPress={() => handleNetworkChange(n as BitcoinNetwork)}
                    style={({ pressed }) => [styles.networkRow, { opacity: pressed ? 0.7 : 1 }]}
                    testID={`network-chip-${n}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: isSelected ? theme.colors.accent : theme.colors.border },
                      ]}
                    >
                      {isSelected && (
                        <View style={[styles.radioInner, { backgroundColor: theme.colors.accent }]} />
                      )}
                    </View>
                    <View style={styles.networkLabelGroup}>
                      <AppText
                        variant="body"
                        style={isSelected ? [styles.networkSelected, { color: theme.colors.accent }] : undefined}
                      >
                        {n === 'mainnet' ? 'Mainnet' : 'Testnet4'}
                      </AppText>
                      <AppText variant="caption" color="muted">
                        {n === 'mainnet' ? t('nodeSettings.networkMainnetDesc') : t('nodeSettings.networkTestnetDesc')}
                      </AppText>
                    </View>
                  </Pressable>
                  {!isLast && (
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                  )}
                </Fragment>
              );
            })}
          </View>
        </View>

        {/* Status card */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: statusBgColor,
              borderColor: statusBorderColor,
              borderRadius: theme.radii.lg,
            },
          ]}
          testID="status-card"
        >
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <AppText
              variant="body"
              style={[styles.statusLabel, { color: statusColor }]}
              testID="status-text"
            >
              {statusText}
            </AppText>
          </View>
          <AppText variant="caption" color="muted" testID="status-desc">
            {statusDesc}
          </AppText>
          {connectionFieldsFilled && status !== 'connected' && !isTesting && (
            <AppText variant="caption" color="muted" testID="test-required-hint">
              {t('nodeSettings.testRequired')}
            </AppText>
          )}
        </View>

        {saveError && (
          <AppText variant="caption" color="danger" testID="save-error">
            {saveError}
          </AppText>
        )}
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
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

  // Scroll
  scroll: {
    gap: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Section
  section: {
    gap: 10,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    marginLeft: 2,
  },

  // Card
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  // Field
  fieldGroup: {
    gap: 4,
    paddingVertical: 10,
  },
  fieldLabel: {
    letterSpacing: 0.5,
  },

  // URL hint
  urlHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  urlHintText: {
    flex: 1,
    lineHeight: 16,
  },

  // Auth toggle
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontWeight: '600',
  },
  togglePill: {
    borderRadius: 99,
    height: 26,
    justifyContent: 'center',
    padding: 2,
    width: 44,
  },
  toggleThumb: {
    backgroundColor: '#fff',
    borderRadius: 99,
    height: 22,
    width: 22,
  },
  thumbOn: {
    transform: [{ translateX: 18 }],
  },
  thumbOff: {
    transform: [{ translateX: 0 }],
  },

  // Token row
  tokenRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tokenInput: {
    flex: 1,
  },
  eyeBtn: {
    alignItems: 'center',
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },

  // Network
  networkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  radioOuter: {
    alignItems: 'center',
    borderRadius: 99,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioInner: {
    borderRadius: 99,
    height: 10,
    width: 10,
  },
  networkLabelGroup: {
    flex: 1,
    gap: 1,
  },
  networkSelected: {
    fontWeight: '600',
  },

  // Status
  statusCard: {
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  statusLabel: {
    fontWeight: '600',
  },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
