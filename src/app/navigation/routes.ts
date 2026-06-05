export const AuthRoutes = {
  Welcome: 'Welcome',
  CreateWallet: 'CreateWallet',
  ImportWallet: 'ImportWallet',
  BackupSeed: 'BackupSeed',
  ConfirmSeed: 'ConfirmSeed',
} as const;

export const AppRoutes = {
  Home: 'Home',
  WalletDetails: 'WalletDetails',
  Receive: 'Receive',
  Send: 'Send',
  TransactionDetails: 'TransactionDetails',
  Utxos: 'Utxos',
  Settings: 'Settings',
  SecuritySettings: 'SecuritySettings',
  NetworkSettings: 'NetworkSettings',
  NodeSettings: 'NodeSettings',
  BackupSettings: 'BackupSettings',
  OfflineMode: 'OfflineMode',
  SafeMode: 'SafeMode',
} as const;

export type AuthStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  ImportWallet: undefined;
  BackupSeed: undefined;
  ConfirmSeed: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  WalletDetails: undefined;
  Receive: undefined;
  Send: undefined;
  TransactionDetails: undefined;
  Utxos: undefined;
  Settings: undefined;
  SecuritySettings: undefined;
  NetworkSettings: undefined;
  NodeSettings: undefined;
  BackupSettings: undefined;
  OfflineMode: undefined;
  SafeMode: undefined;
};
