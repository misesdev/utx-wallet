import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import type { AppStackParamList } from '../../../app/navigation/routes';

type ScanTextQrRouteProps = RouteProp<AppStackParamList, 'ScanTextQr'>;

const CORNER_LEN = 32;
const CORNER_THICK = 3.5;
const MASK_COLOR = 'rgba(0,0,0,0.76)';

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

type PermissionBlockedViewProps = { onBack: () => void };

function PermissionBlockedView({ onBack }: PermissionBlockedViewProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.blockedRoot,
        { backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}
    >
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

export function ScanTextQrScreen() {
  const { t } = useAppTranslation();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const route = useRoute<ScanTextQrRouteProps>();
  const eventName = route.params.eventName;

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const isHandling = useRef(false);
  const [hint] = useState(Platform.OS === 'ios' ? t('qrImport.scannerHint') : t('qrImport.scannerHint'));

  const FRAME = Math.min(Math.max(Math.floor(W * 0.70), 220), 280);
  const FRAME_TOP = Math.max(Math.floor((H - FRAME) * 0.38), 80);
  const FRAME_LEFT = Math.max(Math.floor((W - FRAME) / 2), 0);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleScanned = useCallback(
    (rawValue: string) => {
      if (isHandling.current) return;
      const value = rawValue.trim();
      if (!value) return;
      isHandling.current = true;
      DeviceEventEmitter.emit(eventName, value);
      navigation.goBack();
    },
    [navigation, eventName],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      const value = codes[0]?.value;
      if (value) handleScanned(value);
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
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        codeScanner={codeScanner}
        testID="camera-view"
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ height: FRAME_TOP, backgroundColor: MASK_COLOR }} />
        <View style={[styles.maskRow, { height: FRAME }]}>
          <View style={{ width: FRAME_LEFT, backgroundColor: MASK_COLOR }} />
          <View style={{ width: FRAME, height: FRAME }} testID="text-qr-scanner-frame">
            <ViewfinderCorners />
          </View>
          <View style={[styles.maskFlex, { backgroundColor: MASK_COLOR }]} />
        </View>
        <View style={[styles.maskFlex, { backgroundColor: MASK_COLOR }]} />
      </View>

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

      <View style={[styles.hintContainer, { top: FRAME_TOP + FRAME + 20 }]}>
        <View style={styles.hintPill}>
          <AppText style={styles.hintText}>{hint}</AppText>
        </View>
      </View>
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
