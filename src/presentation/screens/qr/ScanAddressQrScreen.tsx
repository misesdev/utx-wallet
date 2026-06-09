import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';

const CORNER_SIZE = 26;
const CORNER_THICKNESS = 3;
const FRAME_SIZE = 240;

function ViewfinderCorners() {
  const cornerBase: object = {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: 'rgba(255,255,255,0.95)',
  };
  return (
    <>
      <View style={[cornerBase, styles.cornerTL]} />
      <View style={[cornerBase, styles.cornerTR]} />
      <View style={[cornerBase, styles.cornerBL]} />
      <View style={[cornerBase, styles.cornerBR]} />
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
            placeholder={t('qrScan.addressPlaceholder')}
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
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            testID="address-manual-input"
          />
          {!!error && (
            <AppText variant="caption" color="danger" style={styles.sheetError}>
              {error}
            </AppText>
          )}
          <Pressable
            onPress={() => onSubmit(value)}
            disabled={!value.trim()}
            testID="address-manual-submit"
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

export function ScanAddressQrScreen() {
  const { t } = useAppTranslation();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const isHandling = useRef(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleAddressValue = useCallback((rawValue: string) => {
    if (isHandling.current) return;
    const value = rawValue.trim();
    if (!value) {
      setError(t('qrScan.emptyError'));
      setShowManual(true);
      return;
    }
    isHandling.current = true;
    setError('');
    setShowManual(false);
    DeviceEventEmitter.emit('bitcoinAddressScanned', value);
    navigation.goBack();
  }, [navigation, t]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      const value = codes[0]?.value;
      if (value) handleAddressValue(value);
    },
  });

  if (!hasPermission) {
    return <PermissionBlockedView onBack={() => navigation.goBack()} />;
  }

  if (!device) {
    return (
      <View style={[styles.blockedRoot, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.blockedBack}>
          <AppIcon name="back" size={24} color={theme.colors.textMuted} />
        </Pressable>
        <View style={styles.blockedCenter}>
          <AppText variant="title" style={styles.blockedTitle}>{t('qrScan.noCameraTitle')}</AppText>
          <AppText variant="body" color="muted" style={styles.blockedDesc}>{t('qrScan.noCameraDesc')}</AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Live camera feed */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!showManual}
        codeScanner={codeScanner}
        testID="camera-view"
      />

      {/* Dimmed mask overlay */}
      <View style={styles.cameraBackground} pointerEvents="none">
        <View style={styles.maskTop} />
        <View style={styles.maskMiddleRow}>
          <View style={styles.maskSide} />
          <View style={styles.viewfinder} testID="address-qr-scanner-frame">
            <ViewfinderCorners />
          </View>
          <View style={styles.maskSide} />
        </View>
        <View style={styles.maskBottom} />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.topBtn, { opacity: pressed ? 0.7 : 1 }]}
          testID="btn-back"
        >
          <AppIcon name="back" size={24} color="#fff" />
        </Pressable>
        <AppText style={styles.topTitle}>{t('qrImport.scanTitle')}</AppText>
        <View style={styles.topBtn} />
      </View>

      {/* Hint */}
      <View style={styles.hintRow}>
        <AppText style={styles.hintText}>{t('qrImport.scannerHint')}</AppText>
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={() => { setError(''); setShowManual(true); }}
          accessibilityRole="button"
          testID="address-enter-manually-btn"
          style={({ pressed }) => [styles.manualBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <AppIcon name="edit" size={16} color="rgba(255,255,255,0.85)" />
          <AppText style={styles.manualBtnText}>{t('qrImport.enterManually')}</AppText>
        </Pressable>
      </View>

      {showManual && (
        <ManualInputSheet
          onSubmit={handleAddressValue}
          onClose={() => { setShowManual(false); setError(''); isHandling.current = false; }}
          error={error}
        />
      )}
    </View>
  );
}

const MASK_OPACITY = 0.72;

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
  cameraBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  maskTop: {
    backgroundColor: `rgba(0,0,0,${MASK_OPACITY})`,
    flex: 1,
  },
  maskMiddleRow: {
    flexDirection: 'row',
    height: FRAME_SIZE,
  },
  maskSide: {
    backgroundColor: `rgba(0,0,0,${MASK_OPACITY})`,
    flex: 1,
  },
  maskBottom: {
    backgroundColor: `rgba(0,0,0,${MASK_OPACITY})`,
    flex: 1,
  },
  viewfinder: {
    alignItems: 'center',
    height: FRAME_SIZE,
    justifyContent: 'center',
    width: FRAME_SIZE,
  },
  cornerTL: { borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, top: 0, left: 0 },
  cornerTR: { borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, top: 0, right: 0 },
  cornerBL: { borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, bottom: 0, left: 0 },
  cornerBR: { borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, bottom: 0, right: 0 },
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
  hintRow: {
    alignItems: 'center',
    bottom: '35%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  hintText: {
    color: 'rgba(255,255,255,0.8)',
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
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  manualBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
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
    letterSpacing: 0.3,
    padding: 12,
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
});
