import React from 'react';
import { AppSkeleton, SkeletonBalanceCard, SkeletonTransactionItem } from '../../../src/presentation/components/base/AppSkeleton';
import { renderWithTheme } from '../../mocks/renderWithProviders';

describe('AppSkeleton', () => {
  it('renders a single skeleton block', () => {
    const screen = renderWithTheme(<AppSkeleton testID="sk" />);
    expect(screen.getByTestId('sk')).toBeTruthy();
  });

  it('accepts custom width and height', () => {
    const screen = renderWithTheme(<AppSkeleton testID="sk" width={120} height={24} />);
    const el = screen.getByTestId('sk');
    expect(el.props.style).toBeTruthy();
  });
});

describe('SkeletonBalanceCard', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<SkeletonBalanceCard />)).not.toThrow();
  });
});

describe('SkeletonTransactionItem', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<SkeletonTransactionItem />)).not.toThrow();
  });
});
