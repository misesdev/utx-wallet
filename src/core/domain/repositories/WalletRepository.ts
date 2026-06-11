import type { Wallet } from '../entities/Wallet';
import type { BitcoinNetwork } from '../entities/Network';

export type RawWalletKey = {
  kind: 'hd' | 'single-private-key';
  secret: string;
  passphrase?: string;
};

export interface WalletRepository {
  create(name: string): Promise<Wallet>;
  import(name: string, secret: string, network?: BitcoinNetwork, passphrase?: string): Promise<Wallet>;
  list(): Promise<Wallet[]>;
  findById(id: string): Promise<Wallet | null>;
  rename(id: string, name: string): Promise<Wallet>;
  retrieveSeed(id: string): Promise<{ mnemonic: string; passphrase?: string } | null>;
  retrieveRawKey(id: string): Promise<RawWalletKey | null>;
  delete(id: string): Promise<void>;
}
