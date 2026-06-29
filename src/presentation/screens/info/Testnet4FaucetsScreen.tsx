import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';

type FaucetEntry = {
  nameKey: string;
  descKey: string;
  url: string;
};

const FAUCETS: FaucetEntry[] = [
  {
    nameKey: 'faucet.mempoolName',
    descKey: 'faucet.mempoolDesc',
    url: 'https://mempool.space/testnet4/faucet',
  },
  {
    nameKey: 'faucet.coinfaucetName',
    descKey: 'faucet.coinfaucetDesc',
    url: 'https://coinfaucet.eu/en/btc-testnet4',
  },
  {
    nameKey: 'faucet.testnet4InfoName',
    descKey: 'faucet.testnet4InfoDesc',
    url: 'https://testnet4.info/',
  },
  {
    nameKey: 'faucet.cypherfaucetName',
    descKey: 'faucet.cypherfaucetDesc',
    url: 'https://cypherfaucet.com/btc-testnet',
  },
];

export function Testnet4FaucetsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { t } = useAppTranslation();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
          testID="btn-back"
        >
          <AppIcon name="back" size={24} color={theme.colors.textMuted} />
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>{t('faucet.title')}</AppText>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Hero */}
        <View
          style={[
            styles.hero,
            {
              backgroundColor: theme.colors.accentMuted,
              borderColor: theme.colors.accent + '33',
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View
            style={[
              styles.heroIconWrap,
              { backgroundColor: theme.colors.accent + '22', borderRadius: theme.radii.lg },
            ]}
          >
            <AppIcon name="faucet" size={32} color={theme.colors.accent} testID="faucet-hero-icon" />
          </View>
          <AppText variant="title" style={styles.heroTitle}>{t('faucet.heroTitle')}</AppText>
          <AppText variant="body" color="muted" style={styles.heroDesc}>{t('faucet.heroDesc')}</AppText>
        </View>

        {/* Faucet cards */}
        {FAUCETS.map((faucet) => (
          <FaucetCard
            key={faucet.url}
            name={t(faucet.nameKey as Parameters<typeof t>[0])}
            description={t(faucet.descKey as Parameters<typeof t>[0])}
            url={faucet.url}
            openLabel={t('faucet.openFaucet')}
          />
        ))}
      </ScrollView>
    </View>
  );
}

type FaucetCardProps = {
  name: string;
  description: string;
  url: string;
  openLabel: string;
};

function FaucetCard({ name, description, url, openLabel }: FaucetCardProps) {
  const { theme } = useTheme();

  const handleOpen = () => {
    Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View
      testID={`faucet-card-${name}`}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.md }]}>
          <AppIcon name="faucet" size={18} color={theme.colors.accent} />
        </View>
        <View style={styles.cardText}>
          <AppText variant="body" style={styles.cardName}>{name}</AppText>
          <AppText variant="caption" color="faint" style={styles.cardUrl} numberOfLines={1}>{url}</AppText>
        </View>
      </View>

      <View style={[styles.cardDivider, { backgroundColor: theme.colors.border }]} />

      <AppText variant="body" color="muted" style={styles.cardDesc}>{description}</AppText>

      <Pressable
        testID={`btn-open-${name}`}
        accessibilityRole="button"
        accessibilityLabel={`${openLabel} ${name}`}
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.openBtn,
          {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radii.md,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <AppIcon name="externalLink" size={16} color={theme.colors.primaryText} />
        <AppText variant="body" style={[styles.openBtnLabel, { color: theme.colors.primaryText }]}>
          {openLabel}
        </AppText>
      </Pressable>
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
  headerBtn: {
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
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  hero: {
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
    marginBottom: 4,
    padding: 24,
  },
  heroIconWrap: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    marginBottom: 4,
    width: 56,
  },
  heroTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  heroDesc: {
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  cardIconWrap: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cardText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  cardName: {
    fontWeight: '700',
  },
  cardUrl: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
  },
  cardDesc: {
    lineHeight: 20,
  },
  openBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  openBtnLabel: {
    fontWeight: '600',
  },
});
