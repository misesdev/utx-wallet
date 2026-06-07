import React from 'react';
import { BalanceCard } from '../../../src/presentation/components/wallet/BalanceCard';
import { renderWithTheme } from '../../mocks/renderWithProviders';

describe('BalanceCard', () => {
  it('renders the balance in sats', () => {
    const screen = renderWithTheme(<BalanceCard balanceSats={500_000} />);
    expect(screen.getByTestId('balance-amount')).toBeTruthy();
    expect(screen.getByText('500,000')).toBeTruthy();
  });

  it('renders the BTC equivalent', () => {
    const screen = renderWithTheme(<BalanceCard balanceSats={100_000_000} />);
    expect(screen.getByTestId('balance-btc')).toBeTruthy();
    expect(screen.getByText('≈ 1.00000000 BTC')).toBeTruthy();
  });

  it('renders zero balance correctly', () => {
    const screen = renderWithTheme(<BalanceCard balanceSats={0} />);
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('≈ 0.00000000 BTC')).toBeTruthy();
  });

  it('uses custom label when provided', () => {
    const screen = renderWithTheme(
      <BalanceCard balanceSats={100} label="Confirmed balance" />,
    );
    expect(screen.getByText('Confirmed balance')).toBeTruthy();
  });

  it('uses default label when not provided', () => {
    const screen = renderWithTheme(<BalanceCard balanceSats={100} />);
    expect(screen.getByText('wallet.balanceTotal')).toBeTruthy();
  });

  describe('hidden mode', () => {
    it('shows placeholder instead of balance when hidden is true', () => {
      const screen = renderWithTheme(<BalanceCard balanceSats={500_000} hidden />);
      expect(screen.getByTestId('balance-amount').props.children).toBe('••••••');
    });

    it('hides the sats unit when hidden is true', () => {
      const screen = renderWithTheme(<BalanceCard balanceSats={500_000} hidden />);
      expect(screen.queryByText('sats')).toBeNull();
    });

    it('shows placeholder for BTC when hidden is true', () => {
      const screen = renderWithTheme(<BalanceCard balanceSats={500_000} hidden />);
      expect(screen.getByTestId('balance-btc').props.children).toBe('••••••');
    });

    it('shows real balance when hidden is false', () => {
      const screen = renderWithTheme(<BalanceCard balanceSats={500_000} hidden={false} />);
      expect(screen.getByText('500,000')).toBeTruthy();
      expect(screen.getByText('common.sats')).toBeTruthy();
    });
  });
});
