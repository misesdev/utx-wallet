module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.tsx'],
  // bitcoin-tx-lib uses @noble/secp256k1 which calls crypto.subtle internally.
  // Node.js crypto workers do not release their handle automatically, which
  // causes the "worker process failed to exit gracefully" warning. forceExit
  // terminates the process cleanly after all tests complete.
  forceExit: true,
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js|jsx)',
    '**/tests/**/*.test.(ts|tsx|js|jsx)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['<rootDir>/.claude/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-qrcode-svg|react-native-svg|@react-native-clipboard|react-native-vector-icons|react-native-localize|react-i18next|i18next|react-native-vision-camera|bitcoin-tx-lib|@noble|@scure|react-native-biometrics)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/android/**',
    '!**/ios/**',
  ],
};
