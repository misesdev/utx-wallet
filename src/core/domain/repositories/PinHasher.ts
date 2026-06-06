export interface PinHasher {
  hash(pin: string, salt: string): Promise<string>;
}
