import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import { NoopScreenCaptureAdapter } from '../../../core/infrastructure/adapters/ScreenCaptureAdapter';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { QrCodeView } from '../../components/wallet/QrCodeView';
import { SeedWordGrid } from '../../components/wallet/SeedWordGrid';
import { PinInputModal } from '../../components/security/PinInputModal';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useReauthenticate } from '../../hooks/useReauthenticate';
import { useTheme } from '../../hooks/useTheme';
import { useWallet } from '../../hooks/useWallet';

const XPRIV_RE = /^(xprv|tprv|zprv|vprv)[a-zA-Z0-9]+$/;

const screenCaptureGuard = new NoopScreenCaptureAdapter();

export function ViewSeedScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { selectedWallet, getWalletSeed } = useWallet();
  const { requireAuth, pinModalVisible, pinError, submitPin, cancelAuth } = useReauthenticate();

  const [revealed, setRevealed] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [keyValue, setKeyValue] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isExtendedKey = keyValue !== null;

  useEffect(() => {
    screenCaptureGuard.enable();
    return () => screenCaptureGuard.disable();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        setRevealed(false);
        setWords([]);
        setKeyValue(null);
        setPassphrase(undefined);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    requireAuth().then(ok => {
      if (!ok) navigation.goBack();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReveal = useCallback(async () => {
    if (!selectedWallet) return;
    setIsLoading(true);
    try {
      const seed = await getWalletSeed(selectedWallet.id);
      if (seed) {
        if (XPRIV_RE.test(seed.mnemonic.trim())) {
          setKeyValue(seed.mnemonic.trim());
          setWords([]);
        } else {
          setWords(seed.mnemonic.split(' '));
          setKeyValue(null);
          setPassphrase(seed.passphrase);
        }
        setRevealed(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedWallet, getWalletSeed]);

  const handleCopy = useCallback(() => {
    if (!keyValue) return;
    Clipboard.setString(keyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [keyValue]);

  const handleShare = useCallback(async () => {
    if (!keyValue) return;
    await Share.share({ message: keyValue });
  }, [keyValue]);

  const screenTitle = isExtendedKey && revealed
    ? t('viewSeed.titleExtendedKey' as any)
    : t('viewSeed.title');

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <PinInputModal
        visible={pinModalVisible}
        step="verify"
        error={pinError}
        onSubmit={submitPin}
        onCancel={cancelAuth}
      />

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
          <AppText variant="subtitle" style={styles.headerTitle}>{screenTitle}</AppText>
          {selectedWallet && (
            <AppText variant="caption" color="muted" numberOfLines={1}>{selectedWallet.name}</AppText>
          )}
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {/* Security warning */}
        <View
          style={[
            styles.warningCard,
            {
              backgroundColor: theme.colors.dangerMuted ?? theme.colors.surfaceMuted,
              borderColor: theme.colors.danger + '55',
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <AppIcon name="warning" size={22} color={theme.colors.danger} />
          <View style={styles.warningBody}>
            <AppText variant="label" color="danger" style={styles.warningTitle}>{t('backupSeed.keepPrivate')}</AppText>
            <AppText variant="caption" color="muted">{t('backupSeed.warning')}</AppText>
          </View>
        </View>

        {/* Passphrase badge — only for mnemonic wallets */}
        {!isExtendedKey && passphrase ? (
          <View
            style={[
              styles.passphraseBadge,
              {
                backgroundColor: theme.colors.accentMuted,
                borderColor: theme.colors.accent + '55',
                borderRadius: theme.radii.lg,
              },
            ]}
          >
            <AppIcon name="key" size={20} color={theme.colors.accent} />
            <AppText variant="caption" style={{ color: theme.colors.accent }}>
              {t('backupSeed.passphraseActive')}
            </AppText>
          </View>
        ) : null}

        {/* Seed / key card */}
        <View
          style={[
            styles.seedCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          {!revealed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('backupSeed.tapReveal')}
              onPress={handleReveal}
              disabled={isLoading}
              style={[
                styles.revealOverlay,
                { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radii.xl },
              ]}
            >
              <AppIcon name="eye" size={32} color={isLoading ? theme.colors.textMuted : theme.colors.text} />
              <AppText variant="subtitle" style={styles.revealTitle}>
                {isLoading ? t('common.loading') : t('backupSeed.tapReveal')}
              </AppText>
              <AppText variant="caption" color="muted">{t('backupSeed.noCamera')}</AppText>
            </Pressable>
          ) : isExtendedKey ? (
            /* Extended key view: QR + text */
            <View style={styles.extKeyContent}>
              <View
                style={[
                  styles.qrContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderHighlight,
                    borderRadius: theme.radii.lg,
                  },
                ]}
              >
                <QrCodeView value={keyValue!} size={200} testID="seed-qr" />
              </View>
              <View
                style={[
                  styles.keyValueBox,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <AppText variant="label" color="muted" style={styles.keyValueLabel}>
                  {t('walletExport.formatXpriv' as any)}
                </AppText>
                <AppText style={styles.keyValueText} testID="seed-key-value" selectable>
                  {keyValue}
                </AppText>
              </View>
            </View>
          ) : (
            <SeedWordGrid words={words} testID="seed-grid" />
          )}
        </View>

        {/* Copy / Share — only for extended key */}
        {revealed && isExtendedKey && (
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleCopy}
              testID="btn-copy-key"
              accessibilityRole="button"
              accessibilityLabel={t('common.copy')}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.lg,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <AppIcon name="copy" size={22} color={theme.colors.text} />
              <AppText variant="body" style={styles.actionLabel}>
                {copied ? t('walletExport.copied' as any) : t('common.copy')}
              </AppText>
            </Pressable>

            <Pressable
              onPress={handleShare}
              testID="btn-share-key"
              accessibilityRole="button"
              accessibilityLabel={t('common.share')}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.lg,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <AppIcon name="share" size={22} color={theme.colors.text} />
              <AppText variant="body" style={styles.actionLabel}>{t('common.share')}</AppText>
            </Pressable>
          </View>
        )}

        {/* Security tips */}
        <View
          style={[
            styles.tipsCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          {[
            t('backupSeed.neverShare'),
            t('backupSeed.noDigital'),
            t('backupSeed.noRecovery'),
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: theme.colors.textMuted }]} />
              <AppText variant="caption" color="muted" style={styles.tipText}>{tip}</AppText>
            </View>
          ))}
        </View>
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
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  warningCard: {
    alignItems: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  warningBody: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontWeight: '700',
  },
  passphraseBadge: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  seedCard: {
    borderWidth: 1,
    minHeight: 200,
    overflow: 'hidden',
  },
  revealOverlay: {
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    minHeight: 200,
    padding: 32,
  },
  revealTitle: {
    fontWeight: '700',
  },

  // Extended key view
  extKeyContent: {
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  qrContainer: {
    borderWidth: 1,
    padding: 4,
  },
  keyValueBox: {
    alignSelf: 'stretch',
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  keyValueLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  keyValueText: {
    fontFamily: 'monospace',
    fontSize: 13,
    letterSpacing: 0.4,
    lineHeight: 20,
  },

  // Copy / Share action row
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  actionLabel: {
    fontWeight: '600',
  },

  // Tips
  tipsCard: {
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  tipRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  tipDot: {
    borderRadius: 3,
    height: 6,
    marginTop: 5,
    width: 6,
  },
  tipText: {
    flex: 1,
    lineHeight: 18,
  },
});
