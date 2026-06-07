import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/base/AppText';
import { AppIcon } from '../../components/base/AppIcon';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../../app/providers/LanguageProvider';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../shared/i18n';

const LANGUAGE_NATIVE_LABEL_KEYS: Record<SupportedLanguage, string> = {
  'pt-BR': 'language.ptBRNative',
  'en-US': 'language.enUSNative',
};

export function LanguageScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { t } = useAppTranslation();
  const { language, changeLanguage } = useLanguage();

  async function handleSelect(lang: SupportedLanguage) {
    if (lang === language) return;
    await changeLanguage(lang);
    navigation.goBack();
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
        <AppText variant="subtitle" style={styles.headerTitle}>{t('language.title')}</AppText>
        <View style={styles.backBtn} />
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.lg,
          },
        ]}
      >
        {SUPPORTED_LANGUAGES.map((lang, idx) => {
          const isSelected = language === lang;
          const isLast = idx === SUPPORTED_LANGUAGES.length - 1;
          const labelKey = lang === 'pt-BR' ? 'language.ptBR' : 'language.enUS';
          return (
            <React.Fragment key={lang}>
              <Pressable
                testID={`language-option-${lang}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelect(lang)}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
              >
                <View style={styles.rowBody}>
                  <AppText variant="body" style={styles.rowLabel}>{t(labelKey as any)}</AppText>
                  <AppText variant="caption" color="muted">{t(LANGUAGE_NATIVE_LABEL_KEYS[lang] as any)}</AppText>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                    },
                  ]}
                >
                  {isSelected && (
                    <View style={[styles.radioDot, { backgroundColor: theme.colors.accent }]} />
                  )}
                </View>
              </Pressable>
              {!isLast && (
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
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
  headerTitle: {
    flex: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 12,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    fontWeight: '600',
  },
  radioCircle: {
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  radioDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});
