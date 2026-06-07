import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { initI18n, type SupportedLanguage } from '../../shared/i18n';
import type { GetCurrentLanguageUseCase } from '../../core/domain/usecases/language/GetCurrentLanguageUseCase';
import type { SetLanguageUseCase } from '../../core/domain/usecases/language/SetLanguageUseCase';

type LanguageContextValue = {
  language: SupportedLanguage;
  changeLanguage: (lang: SupportedLanguage) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

type LanguageProviderProps = PropsWithChildren<{
  getCurrentLanguage: GetCurrentLanguageUseCase;
  setLanguage: SetLanguageUseCase;
}>;

export function LanguageProvider({ children, getCurrentLanguage, setLanguage }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>('pt-BR');
  const [isReady, setIsReady] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    getCurrentLanguage.execute()
      .then(async lang => {
        await initI18n(lang);
        setLanguageState(lang);
      })
      .catch(() => initI18n('pt-BR'))
      .finally(() => setIsReady(true));
  }, [getCurrentLanguage]);

  const changeLanguage = useCallback(async (lang: SupportedLanguage) => {
    await setLanguage.execute(lang);
    setLanguageState(lang);
  }, [setLanguage]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
