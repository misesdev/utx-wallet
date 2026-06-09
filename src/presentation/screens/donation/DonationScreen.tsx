import React, { useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/base/AppButton';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { PROJECT_DONATION } from '../../../shared/constants/project';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';

export function DonationScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  function handleCopyAddress() {
    Clipboard.setString(PROJECT_DONATION.bitcoinAddress);
    setCopied(true);
  }

  function handleOpenGithub() {
    Linking.openURL(PROJECT_DONATION.githubUrl);
  }

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
        <AppText variant="subtitle" style={styles.headerTitle}>{t('donation.title')}</AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.xl }]}> 
            <AppIcon name="donate" size={34} color={theme.colors.accent} />
          </View>
          <View style={styles.heroText}>
            <AppText variant="title" style={styles.heroTitle}>{t('donation.heroTitle')}</AppText>
            <AppText variant="body" color="muted" style={styles.heroDescription}>{t('donation.description')}</AppText>
          </View>
        </View>

        <View
          style={[
            styles.addressCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: copied ? theme.colors.success : theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <AppIcon name="qrCode" size={22} color={theme.colors.textMuted} />
            <AppText variant="label" color="muted">{t('donation.addressLabel')}</AppText>
          </View>
          <AppText variant="body" selectable style={styles.addressText} testID="donation-address">
            {PROJECT_DONATION.bitcoinAddress}
          </AppText>
          <AppButton
            title={copied ? t('donation.copied') : t('donation.copyAddress')}
            onPress={handleCopyAddress}
            testID="donation-copy-address"
          />
          {copied && (
            <View style={styles.feedbackRow} testID="donation-copy-feedback">
              <AppIcon name="success" size={18} color={theme.colors.success} />
              <AppText variant="caption" color="success">{t('donation.copyFeedback')}</AppText>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('donation.githubLabel')}
          onPress={handleOpenGithub}
          testID="donation-github-link"
          style={({ pressed }) => [
            styles.githubCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <View style={[styles.githubIcon, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.lg }]}> 
            <AppIcon name="externalLink" size={24} color={theme.colors.text} />
          </View>
          <View style={styles.githubText}>
            <AppText variant="body" style={styles.githubTitle}>{t('donation.githubLabel')}</AppText>
            <AppText variant="caption" color="muted" numberOfLines={1}>{PROJECT_DONATION.githubUrl}</AppText>
          </View>
          <AppIcon name="chevronRight" size={22} color={theme.colors.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroCard: {
    alignItems: 'center',
    borderWidth: 1,
    gap: 16,
    padding: 22,
  },
  heroIcon: {
    alignItems: 'center',
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  heroText: {
    gap: 8,
  },
  heroTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  heroDescription: {
    lineHeight: 22,
    textAlign: 'center',
  },
  addressCard: {
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addressText: {
    fontFamily: 'monospace',
    lineHeight: 22,
  },
  feedbackRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  githubCard: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  githubIcon: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  githubText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  githubTitle: {
    fontWeight: '700',
  },
});
