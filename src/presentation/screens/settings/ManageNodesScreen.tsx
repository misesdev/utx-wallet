import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PersonalNode } from '../../../core/domain/entities/PersonalNode';
import { AppButton } from '../../components/base/AppButton';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { usePersonalNodes } from '../../hooks/usePersonalNodes';
import { useTheme } from '../../hooks/useTheme';
import { AppRoutes } from '../../../app/navigation/routes';

const NETWORK_COLORS: Record<string, string> = {
  mainnet: '#F59E0B',
  testnet: '#60A5FA',
  testnet3: '#60A5FA',
  testnet4: '#60A5FA',
};

function NetworkBadge({ network, theme }: { network: string; theme: ReturnType<typeof useTheme>['theme'] }) {
  const color = NETWORK_COLORS[network] ?? theme.colors.textMuted;
  return (
    <View style={[styles.networkBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
      <View style={[styles.networkDot, { backgroundColor: color }]} />
      <AppText variant="caption" style={{ color }}>{network}</AppText>
    </View>
  );
}

function NodeCard({
  node,
  index,
  total,
  theme,
  t,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  node: PersonalNode;
  index: number;
  total: number;
  theme: ReturnType<typeof useTheme>['theme'];
  t: (key: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <View
      style={[
        styles.nodeCard,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
        },
      ]}
      testID={`node-card-${node.id}`}
    >
      {/* Top row: label + network badge */}
      <View style={styles.nodeHeader}>
        <View style={styles.nodeLabelRow}>
          <AppIcon name="node" size={18} color={theme.colors.accent} />
          <AppText variant="body" style={styles.nodeLabel}>{node.label}</AppText>
        </View>
        <NetworkBadge network={node.network} theme={theme} />
      </View>

      {/* URL */}
      <AppText variant="caption" color="muted" numberOfLines={1} style={styles.nodeUrl}>
        {node.url}{node.port ? `:${node.port}` : ''}
      </AppText>

      {/* Priority row */}
      <View style={styles.priorityRow}>
        <AppText variant="caption" color="muted">
          {t('manageNodes.priority')}: {node.priority}
        </AppText>
        <View style={styles.priorityButtons}>
          <Pressable
            onPress={onMoveUp}
            disabled={index === 0}
            style={({ pressed }) => [styles.iconBtn, { opacity: index === 0 ? 0.3 : pressed ? 0.6 : 1 }]}
            testID={`btn-move-up-${node.id}`}
          >
            <AppIcon name="chevronUp" size={18} color={theme.colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={index === total - 1}
            style={({ pressed }) => [styles.iconBtn, { opacity: index === total - 1 ? 0.3 : pressed ? 0.6 : 1 }]}
            testID={`btn-move-down-${node.id}`}
          >
            <AppIcon name="chevronDown" size={18} color={theme.colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
            testID={`btn-edit-${node.id}`}
          >
            <AppIcon name="edit" size={18} color={theme.colors.accent} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
            testID={`btn-delete-${node.id}`}
          >
            <AppIcon name="trash" size={18} color={theme.colors.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function ManageNodesScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  const { nodes, allowPublicFallback, removeNode, moveUp, moveDown, togglePublicFallback } = usePersonalNodes();

  function handleAddNode() {
    navigation.navigate(AppRoutes.NodeSettings);
  }

  function handleEditNode(node: PersonalNode) {
    navigation.navigate(AppRoutes.NodeSettings, { nodeId: node.id });
  }

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
          <AppText variant="subtitle" style={styles.headerTitle}>{t('manageNodes.title')}</AppText>
          <AppText variant="caption" color="muted">{t('manageNodes.subtitle')}</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 80 }]}
      >
        {/* Node list */}
        {nodes.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
              },
            ]}
            testID="empty-nodes"
          >
            <AppIcon name="node" size={36} color={theme.colors.textMuted} />
            <AppText variant="body" color="muted" style={styles.emptyText}>
              {t('manageNodes.empty')}
            </AppText>
            <AppText variant="caption" color="muted" style={styles.emptyText}>
              {t('manageNodes.emptyDesc')}
            </AppText>
          </View>
        ) : (
          nodes.map((node, index) => (
            <NodeCard
              key={node.id}
              node={node}
              index={index}
              total={nodes.length}
              theme={theme}
              t={t}
              onEdit={() => handleEditNode(node)}
              onDelete={() => removeNode(node.id)}
              onMoveUp={() => moveUp(node.id)}
              onMoveDown={() => moveDown(node.id)}
            />
          ))
        )}

        {/* Public fallback toggle */}
        <View
          style={[
            styles.fallbackCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
            },
          ]}
        >
          <View style={styles.fallbackRow}>
            <View style={styles.fallbackText}>
              <AppText variant="body">{t('manageNodes.publicFallback')}</AppText>
              <AppText variant="caption" color="muted">{t('manageNodes.publicFallbackDesc')}</AppText>
            </View>
            <Switch
              value={allowPublicFallback}
              onValueChange={togglePublicFallback}
              testID="toggle-public-fallback"
              trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
            />
          </View>
        </View>

        {/* Info */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
            },
          ]}
        >
          <AppText variant="caption" color="muted">{t('manageNodes.info')}</AppText>
        </View>
      </ScrollView>

      {/* Sticky Add button */}
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
          title={t('manageNodes.addNode')}
          onPress={handleAddNode}
          testID="btn-add-node"
        />
      </View>
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
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Node card
  nodeCard: {
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  nodeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nodeLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  nodeLabel: {
    flex: 1,
    fontWeight: '600',
  },
  nodeUrl: {
    marginTop: 2,
  },
  priorityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priorityButtons: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },

  // Network badge
  networkBadge: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  networkDot: {
    borderRadius: 4,
    height: 6,
    width: 6,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    borderWidth: 1,
    gap: 8,
    padding: 32,
  },
  emptyText: {
    textAlign: 'center',
  },

  // Fallback toggle
  fallbackCard: {
    borderWidth: 1,
    padding: 16,
  },
  fallbackRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  fallbackText: {
    flex: 1,
    gap: 2,
  },

  // Info card
  infoCard: {
    borderWidth: 1,
    padding: 14,
  },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
