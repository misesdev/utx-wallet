import type { BitcoinNetwork } from '../../core/domain/entities/Network';
import type { WalletImportFormat } from '../../core/domain/services/WalletImportFormatDetector';
import type { WalletExportFormat } from '../../core/domain/usecases/wallet/ExportWalletKeyUseCase';

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
  AccelerateTransaction: 'AccelerateTransaction',
  Utxos: 'Utxos',
  Addresses: 'Addresses',
  AccountDetails: 'AccountDetails',
  Segregation: 'Segregation',
  Settings: 'Settings',
  ViewSeed: 'ViewSeed',
  SecuritySettings: 'SecuritySettings',
  NodeSettings: 'NodeSettings',
  NodeTutorial: 'NodeTutorial',
  ManageNodes: 'ManageNodes',
  BackupSettings: 'BackupSettings',
  OfflineMode: 'OfflineMode',
  SafeMode: 'SafeMode',
  LanguageSettings: 'LanguageSettings',
  GlobalSettings: 'GlobalSettings',
  Donation: 'Donation',
  ScanWalletQr: 'ScanWalletQr',
  ScanAddressQr: 'ScanAddressQr',
  ConfirmQrWalletImport: 'ConfirmQrWalletImport',
  WalletPolicy: 'WalletPolicy',
  AddressPolicy: 'AddressPolicy',
  AccountPolicy: 'AccountPolicy',
  ExportWalletFormat: 'ExportWalletFormat',
  ExportWalletKey: 'ExportWalletKey',
  SignatureMenu: 'SignatureMenu',
  SignContent: 'SignContent',
  SignatureResult: 'SignatureResult',
  VerifySignature: 'VerifySignature',
  ScanTextQr: 'ScanTextQr',
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
  ImportWallet: { network?: 'mainnet' | 'testnet'; seedRef?: string } | undefined;
  BackupSeed: undefined;
  ConfirmSeed: undefined;
  Home: undefined;
  WalletDetails: undefined;
  Transactions: undefined;
  Receive: { originId?: string } | undefined;
  SelectOriginReceive: undefined;
  Send: { originId?: string; originName?: string } | undefined;
  SelectOriginSend: undefined;
  SendFees: { originId?: string; originName?: string; toAddress: string; amountSats: string };
  TransactionDetails: { txid?: string } | undefined;
  TransactionSuccess: { txid: string; amountSats: number; feeSats: number };
  AccelerateTransaction: {
    txid: string;
    toAddress: string;
    amountSats: number;
    feeSats: number;
    isConfirmed: boolean;
  };
  Utxos: undefined;
  Addresses: undefined;
  AccountDetails: { originId: string };
  Segregation: undefined;
  Settings: undefined;
  ViewSeed: undefined;
  SecuritySettings: undefined;
  NetworkSettings: undefined;
  NodeSettings: { nodeId?: string } | undefined;
  NodeTutorial: undefined;
  ManageNodes: undefined;
  BackupSettings: undefined;
  OfflineMode: undefined;
  SafeMode: undefined;
  LanguageSettings: undefined;
  GlobalSettings: undefined;
  Donation: undefined;
  ScanWalletQr: { network: BitcoinNetwork };
  ScanAddressQr: undefined;
  WalletPolicy: undefined;
  AddressPolicy: undefined;
  AccountPolicy: undefined;
  ExportWalletFormat: undefined;
  ExportWalletKey: { format: WalletExportFormat; accountIndex?: number };
  SignatureMenu: undefined;
  SignContent: undefined;
  SignatureResult: { encoded: string };
  VerifySignature: undefined;
  ScanTextQr: { eventName: string };
  ConfirmQrWalletImport: {
    secretRef: string;
    format: WalletImportFormat;
    network: BitcoinNetwork;
    canSign: boolean;
    isWatchOnly: boolean;
  };
};
