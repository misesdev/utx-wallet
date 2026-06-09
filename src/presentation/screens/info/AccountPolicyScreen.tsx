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
  isCode?: boolean;
};

const SECTIONS: Section[] = [
  { icon: 'accounts',  titleKey: 'accountPolicy.s1Title', bodyKey: 'accountPolicy.s1Body' },
  { icon: 'wallet',    titleKey: 'accountPolicy.s2Title', bodyKey: 'accountPolicy.s2Body', accent: true, isCode: true },
  { icon: 'key',       titleKey: 'accountPolicy.s3Title', bodyKey: 'accountPolicy.s3Body', isCode: true },
  { icon: 'receive',   titleKey: 'accountPolicy.s4Title', bodyKey: 'accountPolicy.s4Body', isCode: true },
  { icon: 'addresses', titleKey: 'accountPolicy.s5Title', bodyKey: 'accountPolicy.s5Body' },
  { icon: 'eye',       titleKey: 'accountPolicy.s6Title', bodyKey: 'accountPolicy.s6Body', accent: true },
  { icon: 'security',  titleKey: 'accountPolicy.s7Title', bodyKey: 'accountPolicy.s7Body' },
];

export function AccountPolicyScreen() {
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
        <AppText variant="subtitle" style={styles.headerTitle}>{t('accountPolicy.title')}</AppText>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
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
            <AppIcon name="accounts" size={32} color={theme.colors.accent} />
          </View>
          <AppText variant="title" style={styles.heroTitle}>{t('accountPolicy.heroTitle')}</AppText>
          <AppText variant="body" color="muted" style={styles.heroDesc}>{t('accountPolicy.heroDesc')}</AppText>
        </View>

        {SECTIONS.map((section, idx) => (
          <PolicyCard
            key={idx}
            icon={section.icon}
            title={t(section.titleKey as Parameters<typeof t>[0])}
            body={t(section.bodyKey as Parameters<typeof t>[0])}
            accent={section.accent}
            isCode={section.isCode}
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
  isCode?: boolean;
  stepNumber: number;
};

function PolicyCard({ icon, title, body, accent, isCode, stepNumber }: PolicyCardProps) {
  const { theme } = useTheme();
  const iconColor = accent ? theme.colors.accent : theme.colors.textMuted;
  const iconBg = accent ? theme.colors.accentMuted : theme.colors.surfaceMuted;

  const [bodyPreamble, codeBlock] = isCode ? splitCodeBlock(body) : [body, null];

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
      <AppText variant="body" color="muted" style={styles.cardBody}>{bodyPreamble}</AppText>
      {codeBlock ? (
        <View style={[styles.codeBlock, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
          <AppText variant="caption" style={[styles.codeText, { color: theme.colors.accent }]}>
            {codeBlock}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function splitCodeBlock(body: string): [string, string | null] {
  const newlineIdx = body.indexOf('\n\n');
  if (newlineIdx === -1) return [body, null];
  return [body.slice(0, newlineIdx).trim(), body.slice(newlineIdx + 2).trim()];
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
    fontWeight: '600',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
  },
  cardBody: {
    lineHeight: 22,
  },
  codeBlock: {
    padding: 12,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 18,
  },
});
