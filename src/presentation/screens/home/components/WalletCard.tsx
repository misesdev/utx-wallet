import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Wallet } from '../../../../core/domain/entities/Wallet';
import type { BitcoinNetwork } from '../../../../core/domain/entities/Network';
import { AppIcon } from '../../../components/base/AppIcon';
import { AppText } from '../../../components/base/AppText';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { useTheme } from '../../../hooks/useTheme';
import { StatPill } from './StatPill';

export type WalletSummary = {
  balanceSats: number;
  utxoCount: number;
  accountCount: number;
  isLoaded: boolean;
};

const HIDDEN_PLACEHOLDER = '••••••';

const NETWORK_ACCENT: Record<'mainnet' | 'testnet4', string> = {
  mainnet: '#F7931A',
  testnet4: '#178a54',
};

function walletAccent(wallet: Wallet): string {
  return wallet.network === 'mainnet' ? NETWORK_ACCENT.mainnet : NETWORK_ACCENT.testnet4;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatBalance(sats: number): string {
  if (sats >= 100_000_000) return `${(sats / 100_000_000).toFixed(4)} BTC`;
  return `${sats.toLocaleString()} sats`;
}

function networkDisplayName(network: BitcoinNetwork): string {
  if (network === 'mainnet') return 'Mainnet';
  return 'Testnet4';
}

export type WalletCardProps = {
  wallet: Wallet;
  summary: WalletSummary | undefined;
  hidden: boolean;
  isBlocked: boolean;
  onOpen: () => void;
};

export function WalletCard({ wallet, summary, hidden, isBlocked, onOpen }: WalletCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const accent = walletAccent(wallet);
  const isWatchOnly = wallet.status === 'watch-only';

  const rawBalance = summary?.isLoaded ? formatBalance(summary.balanceSats) : '—';
  const balanceLabel = hidden ? HIDDEN_PLACEHOLDER : rawBalance;
  const accountLabel = summary?.isLoaded ? String(summary.accountCount) : '—';
  const utxoLabel = summary?.isLoaded ? String(summary.utxoCount) : '—';
  const hasBalance = !hidden && summary?.isLoaded && summary.balanceSats > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open wallet ${wallet.name}`}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: theme.radii.xl,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      testID={`wallet-card-${wallet.id}`}
    >
      <View style={[
        styles.accentStrip,
        { borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl },
      ]} />

      <View style={styles.cardBody}>
        <View style={styles.identityRow}>
          <View
            style={[
              styles.walletIconWrap,
              { backgroundColor: (isBlocked ? theme.colors.warning : accent) + '22', borderRadius: theme.radii.md },
            ]}
          >
            <AppIcon
              name={isBlocked ? 'safeMode' : 'wallet'}
              size={22}
              color={isBlocked ? theme.colors.warning : accent}
            />
          </View>

          <View style={styles.identityText}>
            <AppText variant="subtitle" style={styles.walletName} numberOfLines={1}>
              {wallet.name}
            </AppText>

            <View style={styles.badgeRow}>
              <View style={[styles.networkBadge, { backgroundColor: accent + '18', borderRadius: theme.radii.sm }]}>
                <View style={[styles.networkDot, { backgroundColor: accent }]} />
                <AppText variant="label" style={[styles.networkLabel, { color: accent }]}>
                  {networkDisplayName(wallet.network)}
                </AppText>
              </View>
              {isWatchOnly && (
                <View style={[styles.watchOnlyBadge, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.sm }]}>
                  <AppIcon name="eye" size={11} color={theme.colors.textMuted} />
                  <AppText variant="label" color="muted">{t('wallet.watchOnly')}</AppText>
                </View>
              )}
            </View>

            {wallet.createdAt ? (
              <AppText variant="caption" color="faint" style={styles.dateText}>
                {formatDate(wallet.createdAt)}
              </AppText>
            ) : null}
          </View>

          <AppIcon
            name={isBlocked ? 'safeMode' : 'chevronRight'}
            size={18}
            color={isBlocked ? theme.colors.warning : theme.colors.textMuted}
          />
        </View>

        <View style={[styles.statsBox, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
          <View style={styles.statsRow}>
            <StatPill
              wide
              label={t('walletList.statBalance')}
              value={balanceLabel}
              accent={hasBalance ? accent : undefined}
              testID={`wallet-stat-balance-${wallet.id}`}
            />
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <StatPill
              label={t('walletList.statAccounts')}
              value={accountLabel}
              testID={`wallet-stat-accounts-${wallet.id}`}
            />
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <StatPill
              label={t('walletList.statUtxos')}
              value={utxoLabel}
              testID={`wallet-stat-utxos-${wallet.id}`}
            />
          </View>
        </View>

        {isBlocked && (
          <View
            style={[
              styles.safeModeWarning,
              {
                backgroundColor: theme.colors.warningMuted,
                borderColor: theme.colors.warning,
                borderRadius: theme.radii.md,
              },
            ]}
            testID={`safe-mode-warning-${wallet.id}`}
          >
            <AppIcon name="warning" size={14} color={theme.colors.warning} />
            <AppText variant="caption" style={[styles.safeModeWarningText, { color: theme.colors.warning }]}>
              {t('safeMode.noNodeForNetwork', { network: networkDisplayName(wallet.network) })}
            </AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentStrip: {
    height: 3,
  },
  cardBody: {
    gap: 12,
    padding: 16,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  walletIconWrap: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  identityText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  walletName: {
    fontWeight: '700',
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  networkBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  networkDot: {
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  networkLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  watchOnlyBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dateText: {
    fontSize: 11,
  },
  statsBox: {},
  statsRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statDivider: {
    alignSelf: 'stretch',
    width: StyleSheet.hairlineWidth,
  },
  safeModeWarning: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  safeModeWarningText: {
    flex: 1,
    fontWeight: '600',
  },
});
