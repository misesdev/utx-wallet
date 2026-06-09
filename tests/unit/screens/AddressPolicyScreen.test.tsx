import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AddressPolicyScreen } from '../../../src/presentation/screens/info/AddressPolicyScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockGoBack = jest.fn();

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('AddressPolicyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen title', () => {
    const screen = renderWithTheme(<AddressPolicyScreen />);
    expect(screen.getByText('addressPolicy.title')).toBeTruthy();
  });

  it('renders the hero section', () => {
    const screen = renderWithTheme(<AddressPolicyScreen />);
    expect(screen.getByText('addressPolicy.heroTitle')).toBeTruthy();
    expect(screen.getByText('addressPolicy.heroDesc')).toBeTruthy();
  });

  it('renders all 7 policy section titles', () => {
    const screen = renderWithTheme(<AddressPolicyScreen />);
    expect(screen.getByText('addressPolicy.s1Title')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s2Title')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s3Title')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s4Title')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s5Title')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s6Title')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s7Title')).toBeTruthy();
  });

  it('renders all 7 policy section bodies', () => {
    const screen = renderWithTheme(<AddressPolicyScreen />);
    expect(screen.getByText('addressPolicy.s1Body')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s2Body')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s3Body')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s4Body')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s5Body')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s6Body')).toBeTruthy();
    expect(screen.getByText('addressPolicy.s7Body')).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const screen = renderWithTheme(<AddressPolicyScreen />);
    fireEvent.press(screen.getByLabelText('common.back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
