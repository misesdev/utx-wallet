import type { WalletId } from './Wallet';

export type AccountId = string;

export type Account = {
  id: AccountId;
  walletId: WalletId;
  label: string;
  derivationPath: string;
  index: number;
};
