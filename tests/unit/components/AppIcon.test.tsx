import React from 'react';
import { AppIcon } from '../../../src/presentation/components/base/AppIcon';
import { ICON_NAMES, type IconName } from '../../../src/shared/icons/iconNames';
import { renderWithTheme } from '../../mocks/renderWithProviders';

describe('AppIcon', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      const screen = renderWithTheme(<AppIcon name="home" />);
      expect(screen.getByTestId('icon-home-outline')).toBeTruthy();
    });

    it('passes testID through to the underlying icon', () => {
      const screen = renderWithTheme(<AppIcon name="send" testID="send-icon" />);
      expect(screen.getByTestId('send-icon')).toBeTruthy();
    });

    it('passes accessibilityLabel through to the underlying icon', () => {
      const screen = renderWithTheme(
        <AppIcon name="receive" accessibilityLabel="Receive funds" />,
      );
      expect(screen.getByLabelText('Receive funds')).toBeTruthy();
    });
  });

  describe('icon name mapping', () => {
    it('renders the correct Ionicons name for "home"', () => {
      const screen = renderWithTheme(<AppIcon name="home" />);
      expect(screen.getByTestId(`icon-${ICON_NAMES.home}`)).toBeTruthy();
    });

    it('renders the correct Ionicons name for "send"', () => {
      const screen = renderWithTheme(<AppIcon name="send" />);
      expect(screen.getByTestId(`icon-${ICON_NAMES.send}`)).toBeTruthy();
    });

    it('renders the correct Ionicons name for "settings"', () => {
      const screen = renderWithTheme(<AppIcon name="settings" />);
      expect(screen.getByTestId(`icon-${ICON_NAMES.settings}`)).toBeTruthy();
    });

    it('renders the correct Ionicons name for "freeze"', () => {
      const screen = renderWithTheme(<AppIcon name="freeze" />);
      expect(screen.getByTestId(`icon-${ICON_NAMES.freeze}`)).toBeTruthy();
    });
  });

  describe('iconNames registry', () => {
    it('has a non-empty Ionicons name for every semantic entry', () => {
      const keys = Object.keys(ICON_NAMES) as IconName[];
      for (const key of keys) {
        expect(typeof ICON_NAMES[key]).toBe('string');
        expect(ICON_NAMES[key].length).toBeGreaterThan(0);
      }
    });

    it('maps "home" to an outline variant', () => {
      expect(ICON_NAMES.home).toContain('outline');
    });

    it('maps "warning" to an appropriate status icon', () => {
      expect(ICON_NAMES.warning).toContain('warning');
    });

    it('maps "success" to a checkmark or checkmark-circle icon', () => {
      expect(ICON_NAMES.success).toContain('checkmark');
    });

    it('maps "error" to a close-circle icon', () => {
      expect(ICON_NAMES.error).toContain('close-circle');
    });

    it('maps "freeze" to snow and "unfreeze" to sunny', () => {
      expect(ICON_NAMES.freeze).toContain('snow');
      expect(ICON_NAMES.unfreeze).toContain('sunny');
    });
  });

  describe('default props', () => {
    it('renders with default size of 24 (smoke test)', () => {
      const screen = renderWithTheme(<AppIcon name="wallet" testID="wallet-icon" />);
      expect(screen.getByTestId('wallet-icon')).toBeTruthy();
    });

    it('renders with custom color without crashing', () => {
      const screen = renderWithTheme(
        <AppIcon name="security" color="#FF6600" testID="security-icon" />,
      );
      expect(screen.getByTestId('security-icon')).toBeTruthy();
    });

    it('renders with custom size without crashing', () => {
      const screen = renderWithTheme(
        <AppIcon name="qrCode" size={32} testID="qr-icon" />,
      );
      expect(screen.getByTestId('qr-icon')).toBeTruthy();
    });
  });
});
