import type { Address } from '../../domain/entities/Address';
import { GenerateReceiveAddressUseCase } from '../../domain/usecases/wallet/GenerateReceiveAddressUseCase';
import { GetCurrentReceiveAddressUseCase } from '../../domain/usecases/wallet/GetCurrentReceiveAddressUseCase';
import { MarkAddressUsedUseCase } from '../../domain/usecases/wallet/MarkAddressUsedUseCase';

export class AddressService {
  constructor(
    private readonly getCurrentReceiveAddressUseCase: GetCurrentReceiveAddressUseCase,
    private readonly generateReceiveAddressUseCase: GenerateReceiveAddressUseCase,
    private readonly markAddressUsedUseCase: MarkAddressUsedUseCase,
  ) {}

  getCurrentReceiveAddress(walletId: string): Promise<Address> {
    return this.getCurrentReceiveAddressUseCase.execute(walletId);
  }

  generateNewReceiveAddress(walletId: string): Promise<Address> {
    return this.generateReceiveAddressUseCase.execute(walletId);
  }

  markAddressUsed(addressValue: string): Promise<void> {
    return this.markAddressUsedUseCase.execute(addressValue);
  }
}
