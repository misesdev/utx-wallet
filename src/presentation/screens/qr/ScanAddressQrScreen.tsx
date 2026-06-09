import React, { useCallback, useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/base/AppIcon';
import { AppText } from '../../components/base/AppText';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';

function eventValue(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object' && 'value' in payload) {
    const value = (payload as { value?: unknown }).value;
    return typeof value === 'string' ? value : '';
  }
  return '';
}

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
                {
                  color: value.trim()
                    ? theme.colors.primaryText
                    : theme.colors.textMuted,
                },
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

export function ScanAddressQrScreen() {
  const { t } = useAppTranslation();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleAddressValue = useCallback((rawValue: string) => {
    const value = rawValue.trim();
    if (!value) {
      setError(t('qrScan.emptyError'));
      setShowManual(true);
      return;
    }
    setError('');
    setShowManual(false);
    DeviceEventEmitter.emit('bitcoinAddressScanned', value);
    navigation.goBack();
  }, [navigation, t]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('bitcoinAddressQrScanned', payload => {
      handleAddressValue(eventValue(payload));
    });
    return () => sub.remove();
  }, [handleAddressValue]);

  return (
    <View style={styles.root}>
      <View style={styles.cameraBackground}>
        <View style={styles.maskTop} />
        <View style={styles.maskMiddleRow}>
          <View style={styles.maskSide} />
          <View style={styles.viewfinder} testID="address-qr-scanner-frame">
            <ViewfinderCorners />
            <AppIcon name="scan" size={28} color="rgba(255,255,255,0.4)" />
          </View>
          <View style={styles.maskSide} />
        </View>
        <View style={styles.maskBottom} />
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

      <View style={styles.hintRow}>
        <AppText style={styles.hintText}>{t('qrImport.scannerHint')}</AppText>
      </View>

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
          onClose={() => { setShowManual(false); setError(''); }}
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
  cameraBackground: {
    ...StyleSheet.absoluteFill,
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
  cornerTL: {
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    top: 0,
    left: 0,
  },
  cornerTR: {
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    top: 0,
    right: 0,
  },
  cornerBL: {
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    bottom: 0,
    left: 0,
  },
  cornerBR: {
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    bottom: 0,
    right: 0,
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
