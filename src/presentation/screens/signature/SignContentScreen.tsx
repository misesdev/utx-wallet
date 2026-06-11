import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { AppLoading } from '../../components/base/AppLoading';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useSignature } from '../../../app/providers/SignatureProvider';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { AppRoutes } from '../../../app/navigation/routes';
import type { BitcoinNetwork } from '../../../core/domain/entities/Network';

export function SignContentScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { signMessage, encodeSignedMessage } = useSignature();
  const { selectedWallet } = useWallet();
  const { networkConfig } = useNetwork();
  const network = networkConfig.network as BitcoinNetwork;

  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSign = async () => {
    if (!content.trim()) {
      setError(t('signature.errorContentRequired'));
      return;
    }
    if (!selectedWallet) return;

    setError('');
    setIsLoading(true);
    try {
      const signed = await signMessage(selectedWallet.id, network, content.trim());
      const encoded = encodeSignedMessage(signed);
      navigation.navigate(AppRoutes.SignatureResult, { encoded });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('watch') || msg.includes('WATCH_ONLY')) {
        setError(t('signature.watchOnlyError'));
      } else {
        setError(t('signature.errorSignFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
            <AppText variant="subtitle" style={styles.headerTitle}>{t('signature.signTitle')}</AppText>
            {selectedWallet && (
              <AppText variant="caption" color="muted" numberOfLines={1}>{selectedWallet.name}</AppText>
            )}
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 100 }]}
        >
          {/* Error banner */}
          {!!error && (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: theme.colors.dangerMuted ?? theme.colors.surfaceMuted,
                  borderColor: theme.colors.danger + '55',
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <AppIcon name="error" size={18} color={theme.colors.danger} />
              <AppText variant="caption" color="danger" style={styles.errorText}>{error}</AppText>
            </View>
          )}

          {/* Content input */}
          <View style={styles.fieldGroup}>
            <AppText variant="label" color="muted" style={styles.fieldLabel}>
              {t('signature.contentLabel')}
            </AppText>
            <View
              style={[
                styles.textAreaWrap,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: error && !content.trim() ? theme.colors.danger : theme.colors.border,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <TextInput
                testID="input-sign-content"
                value={content}
                onChangeText={v => { setContent(v); if (error) setError(''); }}
                placeholder={t('signature.contentPlaceholder')}
                placeholderTextColor={theme.colors.textFaint}
                multiline
                numberOfLines={6}
                style={[styles.textArea, { color: theme.colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        {/* Footer dock */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('signature.signAction')}
            testID="btn-sign-content"
            onPress={handleSign}
            disabled={isLoading || !content.trim()}
            style={({ pressed }) => [
              styles.signBtn,
              {
                backgroundColor: content.trim() ? theme.colors.primary : theme.colors.surfaceRaised,
                borderRadius: theme.radii.lg,
                opacity: pressed || isLoading ? 0.78 : 1,
              },
            ]}
          >
            {isLoading ? (
              <AppLoading />
            ) : (
              <>
                <AppIcon
                  name="sign"
                  size={22}
                  color={content.trim() ? theme.colors.primaryText : theme.colors.textMuted}
                />
                <AppText
                  variant="subtitle"
                  style={[
                    styles.signBtnLabel,
                    { color: content.trim() ? theme.colors.primaryText : theme.colors.textMuted },
                  ]}
                >
                  {t('signature.signAction')}
                </AppText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  errorBanner: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  errorText: {
    flex: 1,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    letterSpacing: 1.2,
    marginLeft: 2,
  },
  textAreaWrap: {
    borderWidth: 1,
    minHeight: 160,
    padding: 12,
  },
  textArea: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 136,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  signBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 24,
  },
  signBtnLabel: {
    fontWeight: '700',
  },
});
