import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { TransactionReviewModal } from '../../../src/presentation/screens/wallet/TransactionReviewModal';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { TransactionPreview } from '../../../src/core/domain/entities/TransactionPreview';

const VALID_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

const PREVIEW: TransactionPreview = {
  toAddress: VALID_ADDRESS,
  amountSats: 100_000,
  feeSats: 900,
  totalSats: 100_900,
  changeSats: 899_100,
  feeRateSatsPerVByte: 5,
  estimatedVBytes: 180,
};

const mockOnConfirm = jest.fn();
const mockOnCancel = jest.fn();

function renderModal(overrides: Partial<{
  visible: boolean;
  preview: TransactionPreview | null;
  isSending: boolean;
  sendError: string | null;
}> = {}) {
  return renderWithTheme(
    <TransactionReviewModal
      visible={overrides.visible ?? true}
      preview={overrides.preview ?? PREVIEW}
      isSending={overrides.isSending ?? false}
      sendError={overrides.sendError ?? null}
      onConfirm={mockOnConfirm}
      onCancel={mockOnCancel}
    />,
  );
}

describe('TransactionReviewModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders modal title when visible', () => {
      const screen = renderModal({ visible: true });
      expect(screen.getByTestId('modal-title')).toBeTruthy();
    });

    it('does not render modal content when not visible', () => {
      const screen = renderModal({ visible: false });
      expect(screen.queryByTestId('modal-title')).toBeNull();
    });
  });

  describe('preview details', () => {
    it('shows the destination address (truncated)', () => {
      const screen = renderModal();
      expect(screen.getByTestId('modal-address')).toBeTruthy();
    });

    it('displays the correct amount', () => {
      const screen = renderModal();
      expect(screen.getByTestId('modal-amount').props.children).toBe('100.000 sats');
    });

    it('displays the correct fee', () => {
      const screen = renderModal();
      expect(screen.getByTestId('modal-fee').props.children).toBe('900 sats');
    });

    it('displays the total deducted', () => {
      const screen = renderModal();
      expect(screen.getByTestId('modal-total').props.children).toBe('100.900 sats');
    });

    it('displays the fee rate', () => {
      const screen = renderModal();
      expect(screen.getByTestId('modal-fee-rate').props.children).toBe('5 sat/vB');
    });
  });

  describe('actions', () => {
    it('calls onConfirm when confirm button is pressed', () => {
      const screen = renderModal();
      fireEvent.press(screen.getByTestId('btn-confirm-send'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is pressed', () => {
      const screen = renderModal();
      fireEvent.press(screen.getByTestId('btn-cancel'));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('disables confirm and cancel buttons while sending', () => {
      const screen = renderModal({ isSending: true });
      expect(screen.getByTestId('btn-confirm-send').props.accessibilityState?.disabled).toBe(true);
      expect(screen.getByTestId('btn-cancel').props.accessibilityState?.disabled).toBe(true);
    });

    it('shows "Enviando…" label on confirm button while sending', () => {
      const screen = renderModal({ isSending: true });
      expect(screen.getByText('Enviando…')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('shows sendError message when present', () => {
      const screen = renderModal({ sendError: 'Saldo insuficiente' });
      expect(screen.getByTestId('modal-send-error')).toBeTruthy();
      expect(screen.getByText('Saldo insuficiente')).toBeTruthy();
    });

    it('hides error section when sendError is null', () => {
      const screen = renderModal({ sendError: null });
      expect(screen.queryByTestId('modal-send-error')).toBeNull();
    });
  });

  describe('no preview', () => {
    it('renders without crashing when preview is null', () => {
      const screen = renderModal({ preview: null });
      expect(screen.getByTestId('modal-title')).toBeTruthy();
    });
  });
});
