export const AuthRoutes = {
  Welcome: 'Welcome',
  CreateWallet: 'CreateWallet',
  ImportWallet: 'ImportWallet',
  BackupSeed: 'BackupSeed',
  ConfirmSeed: 'ConfirmSeed',
} as const;

export const AppRoutes = {
  WalletList: 'WalletList',
  CreateWallet: 'CreateWallet',
  ImportWallet: 'ImportWallet',
  BackupSeed: 'BackupSeed',
  ConfirmSeed: 'ConfirmSeed',
  Home: 'Home',
  WalletDetails: 'WalletDetails',
  Transactions: 'Transactions',
  Receive: 'Receive',
  SelectOriginReceive: 'SelectOriginReceive',
  Send: 'Send',
  SelectOriginSend: 'SelectOriginSend',
  SendFees: 'SendFees',
  TransactionDetails: 'TransactionDetails',
  TransactionSuccess: 'TransactionSuccess',
  Utxos: 'Utxos',
  Addresses: 'Addresses',
  Segregation: 'Segregation',
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
  WalletList: undefined;
  CreateWallet: { network?: 'mainnet' | 'testnet' } | undefined;
  ImportWallet: { network?: 'mainnet' | 'testnet' } | undefined;
  BackupSeed: undefined;
  ConfirmSeed: undefined;
  Home: undefined;
  WalletDetails: undefined;
  Transactions: undefined;
  Receive: { originId?: string } | undefined;
  SelectOriginReceive: undefined;
  Send: { originId?: string } | undefined;
  SelectOriginSend: undefined;
  SendFees: { originId?: string; toAddress: string; amountSats: string };
  TransactionDetails: { txid?: string } | undefined;
  TransactionSuccess: { txid: string; amountSats: number; feeSats: number };
  Utxos: undefined;
  Addresses: undefined;
  Segregation: undefined;
  Settings: undefined;
  SecuritySettings: undefined;
  NetworkSettings: undefined;
  NodeSettings: undefined;
  BackupSettings: undefined;
  OfflineMode: undefined;
  SafeMode: undefined;
};
