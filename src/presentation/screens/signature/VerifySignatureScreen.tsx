import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomDock } from '../../components/base/AppBottomDock';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useSignature } from '../../../app/providers/SignatureProvider';
import { AppRoutes } from '../../../app/navigation/routes';

const SCAN_EVENT = 'signatureQrScanned';

type VerifyResult = 'valid' | 'invalid' | null;

export function VerifySignatureScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { verifyMessage, decodeSignedMessage } = useSignature();

  const [pubkey, setPubkey] = useState('');
  const [content, setContent] = useState('');
  const [sig, setSig] = useState('');
  const [result, setResult] = useState<VerifyResult>(null);
  const [error, setError] = useState('');

  const pubkeyRef = useRef<TextInput>(null);
  const contentRef = useRef<TextInput>(null);
  const sigRef = useRef<TextInput>(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(SCAN_EVENT, (raw: string) => {
      const decoded = decodeSignedMessage(raw);
      if (decoded) {
        setPubkey(decoded.pubkey);
        setContent(decoded.content);
        setSig(decoded.sig);
        setResult(null);
        setError('');
      }
    });
    return () => sub.remove();
  }, [decodeSignedMessage]);

  const handleVerify = useCallback(() => {
    if (!pubkey.trim()) {
      setError(t('signature.errorPubkeyRequired'));
      return;
    }
    if (!content.trim()) {
      setError(t('signature.errorContentRequired'));
      return;
    }
    if (!sig.trim()) {
      setError(t('signature.errorSigRequired'));
      return;
    }
    setError('');
    try {
      const valid = verifyMessage(content.trim(), pubkey.trim(), sig.trim());
      setResult(valid ? 'valid' : 'invalid');
    } catch {
      setResult('invalid');
    }
  }, [pubkey, content, sig, verifyMessage, t]);

  const handleScanQr = useCallback(() => {
    navigation.navigate(AppRoutes.ScanTextQr, { eventName: SCAN_EVENT });
  }, [navigation]);

  const canVerify = pubkey.trim().length > 0 && content.trim().length > 0 && sig.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            <AppText variant="subtitle" style={styles.headerTitle}>{t('signature.verifyTitle')}</AppText>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 100 }]}
        >
          {/* Result banner */}
          {result !== null && (
            <Pressable
              testID="verify-result-banner"
              onPress={() => setResult(null)}
              style={[
                styles.resultBanner,
                {
                  backgroundColor:
                    result === 'valid'
                      ? (theme.colors.successMuted ?? theme.colors.surfaceMuted)
                      : (theme.colors.dangerMuted ?? theme.colors.surfaceMuted),
                  borderColor:
                    result === 'valid' ? theme.colors.success + '55' : theme.colors.danger + '55',
                  borderRadius: theme.radii.lg,
                },
              ]}
            >
              <AppIcon
                name={result === 'valid' ? 'success' : 'error'}
                size={22}
                color={result === 'valid' ? theme.colors.success : theme.colors.danger}
              />
              <View style={styles.resultBody}>
                <AppText
                  variant="body"
                  style={[
                    styles.resultTitle,
                    { color: result === 'valid' ? theme.colors.success : theme.colors.danger },
                  ]}
                >
                  {result === 'valid' ? t('signature.validSignature') : t('signature.invalidSignature')}
                </AppText>
                <AppText variant="caption" color="muted">
                  {result === 'valid' ? t('signature.validDesc') : t('signature.invalidDesc')}
                </AppText>
              </View>
            </Pressable>
          )}

          {/* Error */}
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
              <AppText variant="caption" color="danger">{error}</AppText>
            </View>
          )}

          {/* Public key field */}
          <View style={styles.fieldGroup}>
            <AppText variant="label" color="muted" style={styles.fieldLabel}>
              {t('signature.pubkeyLabel')}
            </AppText>
            <TextInput
              ref={pubkeyRef}
              testID="input-pubkey"
              value={pubkey}
              onChangeText={v => { setPubkey(v); setResult(null); setError(''); }}
              placeholder={t('signature.pubkeyPlaceholder')}
              placeholderTextColor={theme.colors.textFaint}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.md,
                  color: theme.colors.text,
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="next"
              onSubmitEditing={() => contentRef.current?.focus()}
            />
          </View>

          {/* Content field */}
          <View style={styles.fieldGroup}>
            <AppText variant="label" color="muted" style={styles.fieldLabel}>
              {t('signature.contentVerifyLabel')}
            </AppText>
            <View
              style={[
                styles.textAreaWrap,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <TextInput
                ref={contentRef}
                testID="input-verify-content"
                value={content}
                onChangeText={v => { setContent(v); setResult(null); setError(''); }}
                placeholder={t('signature.contentVerifyPlaceholder')}
                placeholderTextColor={theme.colors.textFaint}
                multiline
                numberOfLines={4}
                style={[styles.textArea, { color: theme.colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textAlignVertical="top"
                returnKeyType="next"
                onSubmitEditing={() => sigRef.current?.focus()}
              />
            </View>
          </View>

          {/* Signature field */}
          <View style={styles.fieldGroup}>
            <AppText variant="label" color="muted" style={styles.fieldLabel}>
              {t('signature.sigLabel')}
            </AppText>
            <TextInput
              ref={sigRef}
              testID="input-signature"
              value={sig}
              onChangeText={v => { setSig(v); setResult(null); setError(''); }}
              placeholder={t('signature.sigPlaceholder')}
              placeholderTextColor={theme.colors.textFaint}
              style={[
                styles.input,
                styles.monoInput,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.md,
                  color: theme.colors.text,
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
          </View>
        </ScrollView>

        <AppBottomDock
          leftButton={{
            icon: 'scan',
            label: t('signature.scanQr'),
            onPress: handleScanQr,
            testID: 'btn-scan-signature-qr',
          }}
          rightButton={{
            icon: 'check',
            label: t('signature.verifyAction'),
            onPress: handleVerify,
            backgroundColor: canVerify ? theme.colors.primary : theme.colors.surfaceRaised,
            iconColor: canVerify ? theme.colors.primaryText : theme.colors.textMuted,
            labelColor: canVerify ? theme.colors.primaryText : theme.colors.textMuted,
            testID: 'btn-verify',
          }}
        />
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
  resultBanner: {
    alignItems: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  resultBody: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    fontWeight: '700',
  },
  errorBanner: {
    borderWidth: 1,
    padding: 12,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    letterSpacing: 1.2,
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    fontSize: 14,
    letterSpacing: 0.2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  monoInput: {
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
  textAreaWrap: {
    borderWidth: 1,
    minHeight: 100,
    padding: 12,
  },
  textArea: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 76,
  },
});
