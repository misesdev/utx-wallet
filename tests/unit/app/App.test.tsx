/**
 * Regression guard: AppAuthGate MUST be rendered inside App so that
 * biometric/PIN authentication is required on every app open.
 * Previously AppAuthGate was implemented but never mounted, silently
 * disabling all app-lock protection.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const mockAppAuthGate = jest.fn<null, []>().mockReturnValue(null);

jest.mock('../../../src/app/providers/AppProvider', () => ({
  AppProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('../../../src/app/providers/AppAuthGate', () => ({
  AppAuthGate: () => mockAppAuthGate(),
}));

jest.mock('../../../src/app/navigation/RootNavigator', () => ({
  RootNavigator: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../src/presentation/hooks/useTheme', () => ({
  useTheme: () => ({ theme: { mode: 'dark', colors: {} } }),
}));

describe('App root', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders AppAuthGate so the app-lock gate is always active', () => {
    const App = require('../../../src/app/App').default;
    render(<App />);
    expect(mockAppAuthGate).toHaveBeenCalledTimes(1);
  });

  it('renders AppAuthGate inside AppProvider so SecurityProvider context is available', () => {
    const renderOrder: string[] = [];

    jest.resetModules();
    jest.doMock('../../../src/app/providers/AppProvider', () => ({
      AppProvider: ({ children }: React.PropsWithChildren) => {
        renderOrder.push('AppProvider');
        return <>{children}</>;
      },
    }));
    jest.doMock('../../../src/app/providers/AppAuthGate', () => ({
      AppAuthGate: () => { renderOrder.push('AppAuthGate'); return null; },
    }));
    jest.doMock('../../../src/app/navigation/RootNavigator', () => ({
      RootNavigator: () => null,
    }));
    jest.doMock('react-native-safe-area-context', () => ({
      SafeAreaProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
      useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    }));
    jest.doMock('../../../src/presentation/hooks/useTheme', () => ({
      useTheme: () => ({ theme: { mode: 'dark', colors: {} } }),
    }));

    const App = require('../../../src/app/App').default;
    render(<App />);

    const providerIdx = renderOrder.indexOf('AppProvider');
    const gateIdx = renderOrder.indexOf('AppAuthGate');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeGreaterThan(providerIdx);
  });
});
