import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import type { IconName } from '../../../shared/icons/iconNames';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useNetwork } from '../../hooks/useNetwork';
import { useTheme } from '../../hooks/useTheme';
import { AppRoutes } from '../../../app/navigation/routes';
import type { AppStackParamList } from '../../../app/navigation/routes';

type SettingsRoute = keyof Pick<
  AppStackParamList,
  | 'SecuritySettings'
  | 'NetworkSettings'
  | 'NodeSettings'
  | 'BackupSettings'
  | 'OfflineMode'
  | 'SafeMode'
  | 'LanguageSettings'
>;

type NavItem = {
  icon: IconName;
  titleKey: string;
  descKey: string;
  route: SettingsRoute;
  testID?: string;
  danger?: boolean;
};

type NavGroup = {
  labelKey: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    labelKey: 'settings.groupWallet',
    items: [
      { icon: 'language', titleKey: 'settings.language', descKey: 'settings.languageDesc', route: 'LanguageSettings', testID: 'settings-language' },
      { icon: 'security', titleKey: 'settings.security', descKey: 'settings.securityDesc', route: 'SecuritySettings', testID: 'settings-security', danger: true },
      { icon: 'backup', titleKey: 'settings.backup', descKey: 'settings.backupDesc', route: 'BackupSettings', testID: 'settings-backup' },
    ],
  },
  {
    labelKey: 'settings.groupNetwork',
    items: [
      { icon: 'network', titleKey: 'settings.network', descKey: 'settings.networkDesc', route: 'NetworkSettings', testID: 'settings-network' },
      { icon: 'node', titleKey: 'settings.node', descKey: 'settings.nodeDesc', route: 'NodeSettings', testID: 'settings-node' },
    ],
  },
  {
    labelKey: 'settings.groupAdvanced',
    items: [
      { icon: 'offline', titleKey: 'settings.offline', descKey: 'settings.offlineDesc', route: 'OfflineMode', testID: 'settings-offline' },
      { icon: 'safeMode', titleKey: 'settings.safeMode', descKey: 'settings.safeModeDesc', route: 'SafeMode', testID: 'settings-safe-mode' },
    ],
  },
];

type NavRowProps = NavItem & { title: string; description: string; onPress: () => void; isLast: boolean };

function NavRow({ icon, title, description, testID, danger, onPress, isLast }: NavRowProps) {
  const { theme } = useTheme();
  const iconBg = danger ? theme.colors.dangerMuted : theme.colors.accentMuted;
  const iconColor = danger ? theme.colors.danger : theme.colors.accent;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.72 : 1 }]}
      >
        <View style={[styles.navIcon, { backgroundColor: iconBg, borderRadius: theme.radii.md }]}>
          <AppIcon name={icon} size={22} color={iconColor} />
        </View>
        <View style={styles.navBody}>
          <AppText variant="body" style={styles.navTitle}>{title}</AppText>
          <AppText variant="caption" color="muted" numberOfLines={1}>{description}</AppText>
        </View>
        <AppIcon name="chevronRight" size={22} color={theme.colors.textMuted} />
      </Pressable>
      {!isLast && <View style={[styles.rowDivider, { backgroundColor: theme.colors.border }]} />}
    </>
  );
}

export function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { networkConfig } = useNetwork();
  const { t } = useAppTranslation();

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
        <AppText variant="subtitle" style={styles.headerTitle}>{t('settings.title')}</AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        <View
          style={[
            styles.networkStrip,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
            },
          ]}
        >
          <AppText variant="caption" color="muted">{t('settings.activeNetwork')}</AppText>
          <View style={[styles.networkBadge, { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.sm }]}>
            <AppText variant="label" color="accent">{networkConfig.network}</AppText>
          </View>
        </View>

        {GROUPS.map(group => (
          <View key={group.labelKey} style={styles.group}>
            <AppText variant="label" color="muted" style={styles.groupLabel}>{t(group.labelKey as any)}</AppText>
            <View
              style={[
                styles.groupCard,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.lg,
                },
              ]}
            >
              {group.items.map((item, idx) => (
                <NavRow
                  key={item.route}
                  {...item}
                  title={t(item.titleKey as any)}
                  description={t(item.descKey as any)}
                  onPress={() => navigation.navigate(AppRoutes[item.route])}
                  isLast={idx === group.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}
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

  // Network strip
  networkStrip: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  networkBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  // Groups
  group: {
    gap: 8,
  },
  groupLabel: {
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  groupCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Nav rows
  navRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navIcon: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  navIconText: {
    fontSize: 18,
  },
  navBody: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  navTitle: {
    fontWeight: '600',
  },
  navChevron: {
    fontSize: 22,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
});
