import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { SyncProgress } from '../../../../core/domain/usecases/wallet/SyncProgress';
import { AppIcon } from '../../../components/base/AppIcon';
import { AppText } from '../../../components/base/AppText';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { useTheme } from '../../../hooks/useTheme';

export function addressSyncFormat(address: string): string {
  if (address.length <= 6) return address;
  return `${address.slice(0, 2)}..${address.slice(-4)}`;
}

export function accountSyncFormat(account: string): string {
  if (account.length <= 4) return account;
  return `${account.slice(0, 4)}..`;
}

export type SyncPillProps = {
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  syncProgress: SyncProgress | null;
  onSync: () => void;
};

export function SyncPill({ isSyncing, lastSyncAt, syncError, syncProgress, onSync }: SyncPillProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  let label: string;
  if (isSyncing && syncProgress?.accountName && syncProgress?.currentAddress) {
    label = t('home.syncingAccount', {
      account: accountSyncFormat(syncProgress.accountName),
      address: addressSyncFormat(syncProgress.currentAddress),
    });
  } else if (isSyncing) {
    label = t('home.syncing');
  } else if (syncError) {
    label = syncError;
  } else if (lastSyncAt) {
    label = t('home.lastSync', { time: new Date(lastSyncAt).toLocaleTimeString() });
  } else {
    label = t('home.tapToSync');
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.tapToSync')}
      onPress={onSync}
      disabled={isSyncing}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: syncError ? theme.colors.danger : theme.colors.border,
          borderRadius: theme.radii.xl,
          opacity: pressed || isSyncing ? 0.72 : 1,
        },
      ]}
    >
      <AppText variant="caption" color={syncError ? 'danger' : 'muted'} numberOfLines={1}>
        {label}
      </AppText>
      {!isSyncing && <AppIcon name="sync" size={16} color={theme.colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
