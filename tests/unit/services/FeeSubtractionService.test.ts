import { calcSubtractFeeAmounts } from '../../../src/core/domain/services/FeeSubtractionService';

describe('FeeSubtractionService', () => {
  it('subtracts fee from requested amount', () => {
    const result = calcSubtractFeeAmounts(100_000, 900);
    expect(result.recipientAmountSats).toBe(99_100);
  });

  it('sets totalSats to the requested amount', () => {
    const result = calcSubtractFeeAmounts(100_000, 900);
    expect(result.totalSats).toBe(100_000);
  });

  it('handles fee equal to amount', () => {
    const result = calcSubtractFeeAmounts(1_000, 1_000);
    expect(result.recipientAmountSats).toBe(0);
  });

  it('handles fee greater than amount', () => {
    const result = calcSubtractFeeAmounts(500, 700);
    expect(result.recipientAmountSats).toBe(-200); // caller must validate
  });
});
