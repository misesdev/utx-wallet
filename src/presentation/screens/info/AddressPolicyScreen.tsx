import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import type { IconName } from '../../../shared/icons/iconNames';

type Section = {
  icon: IconName;
  titleKey: string;
  bodyKey: string;
  accent?: boolean;
};

const SECTIONS: Section[] = [
  { icon: 'security',      titleKey: 'addressPolicy.s1Title', bodyKey: 'addressPolicy.s1Body', accent: true },
  { icon: 'receive',       titleKey: 'addressPolicy.s2Title', bodyKey: 'addressPolicy.s2Body' },
  { icon: 'transactions',  titleKey: 'addressPolicy.s3Title', bodyKey: 'addressPolicy.s3Body' },
  { icon: 'accounts',      titleKey: 'addressPolicy.s4Title', bodyKey: 'addressPolicy.s4Body' },
  { icon: 'send',          titleKey: 'addressPolicy.s5Title', bodyKey: 'addressPolicy.s5Body', accent: true },
  { icon: 'filter',        titleKey: 'addressPolicy.s6Title', bodyKey: 'addressPolicy.s6Body' },
  { icon: 'key',           titleKey: 'addressPolicy.s7Title', bodyKey: 'addressPolicy.s7Body', accent: true },
];

export function AddressPolicyScreen() {
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
        >
          <AppIcon name="back" size={24} color={theme.colors.textMuted} />
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>{t('addressPolicy.title')}</AppText>
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
          <View style={[styles.heroIconWrap, { backgroundColor: theme.colors.accent + '22', borderRadius: theme.radii.lg }]}>
            <AppIcon name="addresses" size={32} color={theme.colors.accent} />
          </View>
          <AppText variant="title" style={styles.heroTitle}>{t('addressPolicy.heroTitle')}</AppText>
          <AppText variant="body" color="muted" style={styles.heroDesc}>{t('addressPolicy.heroDesc')}</AppText>
        </View>

        {/* Sections */}
        {SECTIONS.map((section, idx) => (
          <PolicyCard
            key={idx}
            icon={section.icon}
            title={t(section.titleKey as any)}
            body={t(section.bodyKey as any)}
            accent={section.accent}
            stepNumber={idx + 1}
          />
        ))}
      </ScrollView>
    </View>
  );
}

type PolicyCardProps = {
  icon: IconName;
  title: string;
  body: string;
  accent?: boolean;
  stepNumber: number;
};

function PolicyCard({ icon, title, body, accent, stepNumber }: PolicyCardProps) {
  const { theme } = useTheme();
  const iconColor = accent ? theme.colors.accent : theme.colors.textMuted;
  const iconBg = accent ? theme.colors.accentMuted : theme.colors.surfaceMuted;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: accent ? theme.colors.accent + '33' : theme.colors.border,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg, borderRadius: theme.radii.md }]}>
          <AppIcon name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.cardTitleWrap}>
          <AppText variant="caption" color="muted" style={styles.stepLabel}>{stepNumber}</AppText>
          <AppText variant="body" style={styles.cardTitle}>{title}</AppText>
        </View>
      </View>
      <View style={[styles.cardDivider, { backgroundColor: theme.colors.border }]} />
      <AppText variant="body" color="muted" style={styles.cardBody}>{body}</AppText>
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
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cardTitleWrap: {
    flex: 1,
    gap: 1,
  },
  stepLabel: {
    fontSize: 10,
    letterSpacing: 1,
  },
  cardTitle: {
    fontWeight: '700',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -16,
  },
  cardBody: {
    lineHeight: 22,
  },
});
