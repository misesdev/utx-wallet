import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLoading } from '../../components/base/AppLoading';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { useAddressManager } from '../../../app/providers/AddressManagerProvider';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';
import { AppRoutes } from '../../../app/navigation/routes';
import type { AddressOrigin } from '../../../core/domain/entities/AddressOrigin';

type OriginItemProps = {
  origin: AddressOrigin;
  onPress: () => void;
};

function OriginItem({ origin, onPress }: OriginItemProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const isDefault = origin.type === 'default';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Receive to ${origin.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: isDefault ? theme.colors.borderHighlight : theme.colors.border,
          borderRadius: theme.radii.lg,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDefault ? theme.colors.accentMuted : theme.colors.surfaceMuted,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <AppIcon name={isDefault ? "wallet" : "accounts"} size={22} color={isDefault ? theme.colors.accent : theme.colors.textMuted} />
      </View>

      <View style={styles.itemBody}>
        <View style={styles.nameRow}>
          <AppText variant="body" style={styles.originName}>{origin.name}</AppText>
          {isDefault && (
            <View
              style={[
                styles.defaultBadge,
                { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.sm },
              ]}
            >
              <AppText variant="label" color="accent">{t('common.default')}</AppText>
            </View>
          )}
        </View>
        <AppText variant="caption" color="muted">{t('common.account', { accountIndex: origin.accountIndex })}</AppText>
      </View>

      <AppIcon name="chevronRight" size={22} color={theme.colors.textMuted} />
    </Pressable>
  );
}

export function SelectOriginReceiveScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { getOrigins } = useAddressManager();
  const { selectedWallet } = useWallet();

  const [origins, setOrigins] = useState<AddressOrigin[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!selectedWallet) return;
    setIsLoading(true);
    try {
      const list = await getOrigins(selectedWallet.id);
      setOrigins(list);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, getOrigins]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const handleSelect = useCallback((originId: string) => {
    navigation.navigate(AppRoutes.Receive, { originId });
  }, [navigation]);

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
        <View style={styles.headerTitle}>
          <AppText variant="subtitle" style={styles.titleText}>{t('receive.title')}</AppText>
          <AppText variant="caption" color="muted">{t('receive.selectAccount')}</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <AppLoading label={t('common.loadingAccounts')} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
        >
          <View style={styles.intro}>
            <AppText variant="body" color="muted" style={styles.introText}>
              {t('receive.selectAccountDesc')}
            </AppText>
          </View>

          <View style={styles.list}>
            {origins.map(origin => (
              <OriginItem
                key={origin.id}
                origin={origin}
                onPress={() => handleSelect(origin.id)}
              />
            ))}
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
    paddingVertical: 12,
  },
  backBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  titleText: {
    fontWeight: '700',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  intro: {
    paddingHorizontal: 4,
  },
  introText: {
    lineHeight: 22,
  },
  list: {
    gap: 10,
  },
  item: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  iconWrap: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconText: {
    fontSize: 20,
  },
  itemBody: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  originName: {
    fontWeight: '600',
  },
  defaultBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  chevron: {
    fontSize: 22,
  },
});
