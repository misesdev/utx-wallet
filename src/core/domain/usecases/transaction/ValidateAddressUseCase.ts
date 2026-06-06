import { BitcoinAddress } from '../../value-objects/BitcoinAddress';

export class ValidateAddressUseCase {
  execute(address: string): { valid: boolean; error: string | null } {
    if (!address || address.trim().length === 0) {
      return { valid: false, error: null };
    }
    try {
      BitcoinAddress.of(address.trim());
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : 'Endereço inválido' };
    }
  }
}
