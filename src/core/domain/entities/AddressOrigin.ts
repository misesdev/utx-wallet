export type OriginType = 'default' | 'custom';

export type AddressOrigin = {
  id: string;
  walletId: string;
  name: string;
  type: OriginType;
  accountIndex: number;
  createdAt: string;
  archivedAt: string | null;
};

export const DEFAULT_ORIGIN_NAME = 'Default';
