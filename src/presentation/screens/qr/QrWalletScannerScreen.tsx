import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { WalletImportFormatDetector } from '../../../core/domain/services/WalletImportFormatDetector';
import { stashSensitiveData } from '../../../core/infrastructure/adapters/SensitiveDataStore';
import type { BitcoinNetwork } from '../../../core/domain/entities/Network';
import { AppRoutes, type AppStackParamList } from '../../../app/navigation/routes';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';

type ScannerRoute = RouteProp<AppStackParamList, typeof AppRoutes.ScanWalletQr>;

const detector = new WalletImportFormatDetector();

const CORNER_LEN = 32;
const CORNER_THICK = 3.5;
const MASK_OPACITY = 0.76;
const MASK_COLOR = `rgba(0,0,0,${MASK_OPACITY})`;

function ViewfinderCorners() {
  return (
    <>
      <View style={[styles.cornerBase, styles.cornerTL]} />
      <View style={[styles.cornerBase, styles.cornerTR]} />
      <View style={[styles.cornerBase, styles.cornerBL]} />
      <View style={[styles.cornerBase, styles.cornerBR]} />
    </>
  );
}

type ManualInputSheetProps = {
  onSubmit: (value: string) => void;
  onClose: () => void;
  error: string;
};

function ManualInputSheet({ onSubmit, onClose, error }: ManualInputSheetProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [value, setValue] = useState('');

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalDismiss} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sheetHandle} />
          <AppText variant="subtitle" style={styles.sheetTitle}>
            {t('qrImport.manualLabel')}
          </AppText>
          <TextInput
            value={value}
            onChangeText={v => setValue(v)}
            placeholder={t('qrImport.manualPlaceholder')}
            placeholderTextColor={theme.colors.textFaint}
            style={[
              styles.sheetInput,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: error ? theme.colors.danger : theme.colors.border,
                borderRadius: theme.radii.md,
                color: theme.colors.text,
              },
            ]}
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            testID="qr-manual-input"
          />
          {!!error && (
            <AppText variant="caption" color="danger" style={styles.sheetError}>
              {error}
            </AppText>
          )}
          <Pressable
            onPress={() => onSubmit(value)}
            disabled={!value.trim()}
            testID="qr-manual-submit"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.sheetBtn,
              {
                backgroundColor: value.trim()
                  ? theme.colors.primary
                  : theme.colors.surfaceRaised,
                borderRadius: theme.radii.lg,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <AppText
              variant="subtitle"
              style={[
                styles.sheetBtnLabel,
                { color: value.trim() ? theme.colors.primaryText : theme.colors.textMuted },
              ]}
            >
              {t('qrImport.continue')}
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type PermissionBlockedViewProps = { onBack: () => void };

function PermissionBlockedView({ onBack }: PermissionBlockedViewProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.blockedRoot, { backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <Pressable onPress={onBack} style={({ pressed }) => [styles.blockedBack, { opacity: pressed ? 0.6 : 1 }]}>
        <AppIcon name="back" size={24} color={theme.colors.textMuted} />
      </Pressable>
      <View style={styles.blockedCenter}>
        <AppIcon name="scan" size={48} color={theme.colors.textMuted} />
        <AppText variant="title" style={styles.blockedTitle}>{t('qrScan.permissionDeniedTitle')}</AppText>
        <AppText variant="body" color="muted" style={styles.blockedDesc}>{t('qrScan.permissionDeniedDesc')}</AppText>
        <Pressable
          onPress={() => Linking.openSettings()}
          style={({ pressed }) => [
            styles.blockedBtn,
            { backgroundColor: theme.colors.accent, borderRadius: theme.radii.lg, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <AppText variant="subtitle" style={styles.blockedBtnText}>{t('qrScan.openSettings')}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

export function QrWalletScannerScreen() {
  const { t } = useAppTranslation();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute<ScannerRoute>();
  const selectedNetwork: BitcoinNetwork = route.params?.network ?? 'testnet4';
  const { width: W, height: H } = useWindowDimensions();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const isHandling = useRef(false);

  // Responsive frame — 70% of screen width, clamped 220–280px
  const FRAME = Math.min(Math.max(Math.floor(W * 0.70), 220), 280);
  // Position at ~38% from top so viewfinder sits above center (bottom area has controls)
  const FRAME_TOP = Math.max(Math.floor((H - FRAME) * 0.38), 80);
  const FRAME_LEFT = Math.max(Math.floor((W - FRAME) / 2), 0);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleQrValue = useCallback((rawValue: string) => {
    if (isHandling.current) return;
    const value = rawValue.trim();
    if (!value) return;
    isHandling.current = true;
    const detected = detector.detect(value, selectedNetwork);
    if (!detected) {
      setError(t('qrImport.invalidFormat'));
      setShowManual(true);
      isHandling.current = false;
      return;
    }
    setError('');
    setShowManual(false);
    if (detected.format === 'mnemonic') {
      const importNetwork = (detected.network ?? selectedNetwork) as BitcoinNetwork;
      navigation.navigate(AppRoutes.ImportWallet, {
        network: importNetwork,
        seedRef: stashSensitiveData(detected.normalizedSecret),
      });
      return;
    }
    navigation.navigate(AppRoutes.ConfirmQrWalletImport, {
      secretRef: stashSensitiveData(detected.normalizedSecret),
      format: detected.format,
      network: detected.network ?? selectedNetwork,
      canSign: detected.canSign,
      isWatchOnly: detected.isWatchOnly,
    });
  }, [navigation, selectedNetwork, t]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      const value = codes[0]?.value;
      if (value) handleQrValue(value);
    },
  });

  if (!hasPermission) {
    return <PermissionBlockedView onBack={() => navigation.goBack()} />;
  }

  if (!device) {
    return (
      <View style={[styles.blockedRoot, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.blockedBack}>
          <AppIcon name="back" size={24} color="rgba(255,255,255,0.8)" />
        </Pressable>
        <View style={styles.blockedCenter}>
          <AppText style={styles.blockedTitle}>{t('qrScan.noCameraTitle')}</AppText>
          <AppText style={styles.blockedDesc}>{t('qrScan.noCameraDesc')}</AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Live camera feed — fills entire screen */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!showManual}
        codeScanner={codeScanner}
        testID="camera-view"
      />

      {/* Dimmed overlay with transparent viewfinder cutout.
          Uses explicit pixel heights derived from useWindowDimensions so the
          viewfinder is always centred correctly, regardless of navigator
          container height or safe-area adjustments. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* top mask */}
        <View style={{ height: FRAME_TOP, backgroundColor: MASK_COLOR }} />
        {/* middle row */}
        <View style={[styles.maskRow, { height: FRAME }]}>
          <View style={{ width: FRAME_LEFT, backgroundColor: MASK_COLOR }} />
          <View style={{ width: FRAME, height: FRAME }} testID="qr-scanner-frame">
            <ViewfinderCorners />
          </View>
          <View style={[styles.maskFlex, { backgroundColor: MASK_COLOR }]} />
        </View>
        {/* bottom mask */}
        <View style={[styles.maskFlex, { backgroundColor: MASK_COLOR }]} />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.topBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <AppIcon name="back" size={24} color="#fff" />
        </Pressable>
        <AppText style={styles.topTitle}>{t('qrImport.scanTitle')}</AppText>
        <View style={styles.topBtn} />
      </View>

      {/* Hint — positioned just below the viewfinder frame */}
      <View style={[styles.hintContainer, { top: FRAME_TOP + FRAME + 20 }]}>
        <View style={styles.hintPill}>
          <AppText style={styles.hintText}>{t('qrImport.scannerHint')}</AppText>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={() => { setError(''); setShowManual(true); }}
          accessibilityRole="button"
          testID="qr-enter-manually-btn"
          style={({ pressed }) => [styles.manualBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <AppIcon name="edit" size={16} color="rgba(255,255,255,0.9)" />
          <AppText style={styles.manualBtnText}>{t('qrImport.enterManually')}</AppText>
        </Pressable>
      </View>

      {showManual && (
        <ManualInputSheet
          onSubmit={handleQrValue}
          onClose={() => { setShowManual(false); setError(''); isHandling.current = false; }}
          error={error}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  blockedRoot: {
    flex: 1,
  },
  blockedBack: {
    margin: 16,
    padding: 8,
    alignSelf: 'flex-start',
  },
  blockedCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  blockedTitle: {
    fontWeight: '700',
    fontSize: 20,
    textAlign: 'center',
  },
  blockedDesc: {
    lineHeight: 22,
    textAlign: 'center',
  },
  blockedBtn: {
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  blockedBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  topTitle: {
    color: '#fff',
    flex: 1,
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
  },
  hintContainer: {
    alignItems: 'center',
    left: 0,
    paddingHorizontal: 32,
    position: 'absolute',
    right: 0,
  },
  hintPill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hintText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    textAlign: 'center',
  },
  bottomBar: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    paddingTop: 20,
    position: 'absolute',
    right: 0,
  },
  manualBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  manualBtnText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 16,
    padding: 24,
    paddingTop: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: 'rgba(120,120,128,0.4)',
    borderRadius: 2.5,
    height: 4,
    width: 36,
    marginBottom: 4,
  },
  sheetTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  sheetInput: {
    borderWidth: 1,
    fontSize: 14,
    fontFamily: 'monospace',
    height: 100,
    letterSpacing: 0.3,
    padding: 12,
    textAlignVertical: 'top',
  },
  sheetError: {
    marginTop: -8,
    textAlign: 'center',
  },
  sheetBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  sheetBtnLabel: {
    fontWeight: '700',
  },
  // Viewfinder overlay helpers
  maskRow: {
    flexDirection: 'row',
  },
  maskFlex: {
    flex: 1,
  },
  cornerBase: {
    position: 'absolute',
    width: CORNER_LEN,
    height: CORNER_LEN,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderBottomRightRadius: 4 },
});
