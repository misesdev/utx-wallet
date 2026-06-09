export type SfaAmounts = {
  recipientAmountSats: number;
  totalSats: number;
};

export function calcSubtractFeeAmounts(
  requestedAmountSats: number,
  feeSats: number,
): SfaAmounts {
  return {
    recipientAmountSats: requestedAmountSats - feeSats,
    totalSats: requestedAmountSats,
  };
}
