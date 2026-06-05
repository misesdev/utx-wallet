import React from 'react';

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
