import type { BitcoinNetwork } from '../entities/Network';
import type { AddressChain } from '../entities/WalletAddress';

export function buildDerivationPath(
  purpose: number,
  coinType: number,
  accountIndex: number,
  change: 0 | 1,
  index: number,
): string {
  return `m/${purpose}'/${coinType}'/${accountIndex}'/${change}/${index}`;
}

export function derivationPathForAddress(
  network: BitcoinNetwork,
  accountIndex: number,
  chain: AddressChain,
  index: number,
): string {
  const coinType = network === 'mainnet' ? 0 : 1;
  const change: 0 | 1 = chain === 'receive' ? 0 : 1;
  return buildDerivationPath(84, coinType, accountIndex, change, index);
}
