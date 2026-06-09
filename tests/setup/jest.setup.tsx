import React from 'react';

// react-native-get-random-values has a native module that isn't available in Node.js.
// In tests, globalThis.crypto.getRandomValues is already provided by Node.js ≥ 16,
// so we just need to stub the import to prevent "NativeModule not found" errors.
jest.mock('react-native-get-random-values', () => {});

jest.mock('react-native-encrypted-storage', () => ({
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@op-engineering/op-sqlite', () => {
  const createMockDb = () => ({
    execute: jest.fn(() => Promise.resolve({ rows: [], rowsAffected: 0 })),
    executeSync: jest.fn(() => ({ rows: [], rowsAffected: 0 })),
    close: jest.fn(),
  });
  return {
    open: jest.fn(createMockDb),
    openAsync: jest.fn(() => Promise.resolve(createMockDb())),
    ANDROID_DATABASE_PATH: '/data/data/com.utxwallet/databases',
    ANDROID_FILES_PATH: '/data/data/com.utxwallet/files',
    ANDROID_EXTERNAL_FILES_PATH: '/sdcard/Android/data/com.utxwallet/files',
    IOS_DOCUMENT_PATH: '/var/mobile/Documents',
    IOS_LIBRARY_PATH: '/var/mobile/Library',
  };
});

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DarkTheme: { colors: {} },
  DefaultTheme: { colors: {} },
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb: () => void) => { cb(); },
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Screen: ({ component: Component }: { component: React.ComponentType }) => <Component />,
  }),
}));

jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const mock = (name: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      ReactModule.createElement(View, { testID: name, ...props }, children);
  return {
    Svg: mock('Svg'),
    Rect: mock('Rect'),
    Path: mock('Path'),
    G: mock('G'),
    default: mock('Svg'),
  };
});

jest.mock('react-native-qrcode-svg', () => {
  const ReactModule = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ value, testID }: { value: string; testID?: string }) =>
      ReactModule.createElement(View, { testID: testID ?? 'qr-code' },
        ReactModule.createElement(Text, { testID: 'qr-value' }, value),
      ),
  };
});

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    setString: jest.fn(),
    getString: jest.fn(() => Promise.resolve('')),
  },
}));

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: jest.fn(() => ({ languageTag: 'pt-BR', isRTL: false })),
  getLocales: jest.fn(() => [{ languageTag: 'pt-BR', isRTL: false }]),
}));

jest.mock('react-i18next', () => {
  const ReactMock = require('react');
  const t = (key: string, opts?: Record<string, unknown>) => {
    if (!opts) return key;
    return Object.entries(opts).reduce(
      (str, [k, v]) => str.replace(new RegExp(`{{${k}}}`, 'g'), String(v)),
      key,
    );
  };
  const i18n = {
    language: 'pt-BR',
    changeLanguage: jest.fn().mockResolvedValue(undefined),
  };
  return {
    useTranslation: () => ({ t, i18n }),
    initReactI18next: { type: '3rdParty', init: jest.fn() },
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
    Trans: ({ i18nKey }: { i18nKey: string }) => ReactMock.createElement('Text', null, i18nKey),
  };
});

jest.mock('../../src/shared/i18n', () => ({
  initI18n: jest.fn().mockResolvedValue(undefined),
  i18next: {
    isInitialized: false,
    use: jest.fn().mockReturnThis(),
    init: jest.fn().mockResolvedValue(undefined),
    changeLanguage: jest.fn().mockResolvedValue(undefined),
  },
  DEFAULT_LANGUAGE: 'pt-BR',
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US'],
}));

jest.mock('../../src/app/providers/SecurityProvider', () => ({
  ...jest.requireActual('../../src/app/providers/SecurityProvider'),
  useSecurity: jest.fn(() => ({
    settings: {
      pinEnabled: false,
      biometricEnabled: false,
      autoLockSeconds: 300,
      hideBalance: false,
      blockScreenshots: true,
    },
    biometricAvailable: false,
    biometricType: 'none',
    isLoading: false,
    updateSettings: jest.fn().mockResolvedValue(undefined),
    setupPin: jest.fn().mockResolvedValue(undefined),
    validatePin: jest.fn().mockResolvedValue(true),
    removePin: jest.fn().mockResolvedValue(undefined),
    reauthenticate: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('react-native-vector-icons/Ionicons', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  const MockIonicons = ({
    name,
    testID,
    accessibilityLabel,
  }: {
    name: string;
    size?: number;
    color?: string | number;
    testID?: string;
    accessibilityLabel?: string;
  }) =>
    ReactMock.createElement(View, {
      testID: testID ?? `icon-${name}`,
      accessibilityLabel,
    });
  return MockIonicons;
});

jest.mock('react-native-vision-camera', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return {
    Camera: Object.assign(
      ({ testID, style }: { testID?: string; style?: object }) =>
        ReactMock.createElement(View, { testID: testID ?? 'camera-view', style }),
      {
        getCameraPermissionStatus: jest.fn(() => 'authorized'),
        requestCameraPermission: jest.fn(() => Promise.resolve('authorized')),
      },
    ),
    useCameraDevice: jest.fn(() => ({ id: 'back', position: 'back', name: 'Back Camera' })),
    useCameraPermission: jest.fn(() => ({
      hasPermission: true,
      status: 'authorized',
      requestPermission: jest.fn(() => Promise.resolve(true)),
    })),
    useCodeScanner: jest.fn(({ onCodeScanned }: { onCodeScanned: (codes: Array<{ value?: string }>) => void }) => ({
      __onCodeScanned: onCodeScanned,
    })),
  };
});
