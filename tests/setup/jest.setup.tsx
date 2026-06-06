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
