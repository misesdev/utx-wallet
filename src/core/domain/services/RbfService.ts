export const RBF_SEQUENCE_THRESHOLD = 0xFFFFFFFE;

const DUST_THRESHOLD_SATS = 546;

/**
 * Check if a raw transaction is RBF-eligible based on input sequences.
 * A transaction signals RBF if any input has sequence < 0xFFFFFFFE.
 */
export function isRbfEligible(inputs: { sequence: number }[]): boolean {
  return inputs.some(i => i.sequence < RBF_SEQUENCE_THRESHOLD);
}

/**
 * Calculate fee in sats needed for a given fee rate and estimated vBytes.
 */
export function calcNewFeeSats(estimatedVBytes: number, newFeeRateSatsPerVByte: number): number {
  return Math.ceil(estimatedVBytes * newFeeRateSatsPerVByte);
}

/**
 * Calculate the new recipient output value after applying the bumped fee.
 * The fee increase is always deducted from the recipient, keeping change unchanged.
 */
export function calcNewRecipientSats(
  totalInputSats: number,
  changeAmountSats: number,
  newFeeSats: number,
): number {
  return totalInputSats - changeAmountSats - newFeeSats;
}

export type FeeValidationResult =
  | { valid: true }
  | { valid: false; reason: 'fee-not-higher' | 'recipient-below-dust' };

/**
 * Validate that the proposed fee bump is valid:
 * - New fee must be strictly higher than current fee
 * - New recipient amount must be at or above dust threshold (546 sats)
 */
export function validateFeeBump(
  currentFeeSats: number,
  newFeeSats: number,
  newRecipientSats: number,
): FeeValidationResult {
  if (newFeeSats <= currentFeeSats) return { valid: false, reason: 'fee-not-higher' };
  if (newRecipientSats < DUST_THRESHOLD_SATS) return { valid: false, reason: 'recipient-below-dust' };
  return { valid: true };
}
