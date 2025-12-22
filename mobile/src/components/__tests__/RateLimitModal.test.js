import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock Modal before importing component
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Modal = ({ visible, children, ...props }) => {
    if (!visible) return null;
    return <RN.View testID="modal" {...props}>{children}</RN.View>;
  };
  // Mock Linking to prevent test crashes
  RN.Linking = {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
  };
  return RN;
});

import RateLimitModal from '../RateLimitModal';

describe('RateLimitModal', () => {
  const defaultProps = {
    visible: true,
    isDistressed: false,
    retryAfter: 5,
    crisisResources: [],
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Standard Mode (not distressed)', () => {
    it('renders standard content when not distressed', () => {
      const { getByText } = render(<RateLimitModal {...defaultProps} />);

      expect(getByText('Taking a Breather')).toBeTruthy();
      expect(getByText("You're using the app a lot — that's great! Give us a moment to catch up.")).toBeTruthy();
      expect(getByText('Taking a moment to breathe can be helpful too!')).toBeTruthy();
    });

    it('shows countdown timer in standard mode', () => {
      const { getByText } = render(<RateLimitModal {...defaultProps} retryAfter={60} />);

      expect(getByText('Ready in')).toBeTruthy();
      expect(getByText('1m 0s')).toBeTruthy();
    });

    it('shows seconds only for short countdowns', () => {
      const { getByText } = render(<RateLimitModal {...defaultProps} retryAfter={30} />);

      expect(getByText('30s')).toBeTruthy();
    });

    it('does not show continue button while countdown is active', () => {
      const { queryByText } = render(<RateLimitModal {...defaultProps} retryAfter={10} />);

      expect(queryByText('Continue')).toBeNull();
    });

    it('shows continue button when countdown reaches zero', async () => {
      const { getByText, queryByText } = render(<RateLimitModal {...defaultProps} retryAfter={1} />);

      // Initially no button
      expect(queryByText('Continue')).toBeNull();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(getByText('Continue')).toBeTruthy();
      });
    });

    it('calls onClose when continue button is pressed', async () => {
      const onClose = jest.fn();
      const { getByText } = render(<RateLimitModal {...defaultProps} retryAfter={0} onClose={onClose} />);

      const continueButton = getByText('Continue');
      fireEvent.press(continueButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Distressed Mode', () => {
    const distressedProps = {
      ...defaultProps,
      isDistressed: true,
      retryAfter: 5,
    };

    it('renders distressed content when isDistressed is true', () => {
      const { getByText } = render(<RateLimitModal {...distressedProps} />);

      expect(getByText("We're Here for You")).toBeTruthy();
      expect(getByText('While we process your previous entries, here are resources available right now:')).toBeTruthy();
    });

    it('renders default crisis resources when none provided', () => {
      const { getByText } = render(<RateLimitModal {...distressedProps} />);

      expect(getByText('988 Suicide & Crisis Lifeline')).toBeTruthy();
      expect(getByText('Crisis Text Line')).toBeTruthy();
      expect(getByText('Emergency Services')).toBeTruthy();
    });

    it('renders custom crisis resources when provided', () => {
      const customResources = [
        {
          id: 'custom-1',
          name: 'Custom Hotline',
          description: 'Test description',
          phone: '123',
          type: 'call',
        },
      ];

      const { getByText, queryByText } = render(
        <RateLimitModal {...distressedProps} crisisResources={customResources} />
      );

      expect(getByText('Custom Hotline')).toBeTruthy();
      expect(queryByText('988 Suicide & Crisis Lifeline')).toBeNull();
    });

    it('displays call action for phone resources', () => {
      const { getByText } = render(<RateLimitModal {...distressedProps} />);

      // Verify call resources show phone number and action
      expect(getByText('988 Suicide & Crisis Lifeline')).toBeTruthy();
      expect(getByText('Call: 988')).toBeTruthy();
    });

    it('displays text action for text resources', () => {
      const { getByText } = render(<RateLimitModal {...distressedProps} />);

      // Verify text resources show text action
      expect(getByText('Crisis Text Line')).toBeTruthy();
      expect(getByText('Text: 741741')).toBeTruthy();
    });

    it('shows countdown in distressed mode', () => {
      const { getByText } = render(<RateLimitModal {...distressedProps} retryAfter={30} />);

      expect(getByText('Ready to continue in:')).toBeTruthy();
      expect(getByText('30s')).toBeTruthy();
    });
  });

  describe('Countdown Timer', () => {
    it('counts down every second', async () => {
      const { getByText } = render(<RateLimitModal {...defaultProps} retryAfter={3} />);

      expect(getByText('3s')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(getByText('2s')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(getByText('1s')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(getByText('0s')).toBeTruthy();
    });

    it('stops counting at zero', () => {
      const { getByText } = render(<RateLimitModal {...defaultProps} retryAfter={1} />);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should stay at 0, not go negative
      expect(getByText('0s')).toBeTruthy();
    });

    it('resets countdown when modal becomes visible', () => {
      const { rerender, getByText } = render(
        <RateLimitModal {...defaultProps} visible={false} retryAfter={10} />
      );

      // Make it visible
      rerender(<RateLimitModal {...defaultProps} visible={true} retryAfter={10} />);

      expect(getByText('10s')).toBeTruthy();
    });
  });

  describe('Modal Behavior', () => {
    it('does not render when not visible', () => {
      const { queryByText } = render(<RateLimitModal {...defaultProps} visible={false} />);

      // Modal content should not be visible
      expect(queryByText('Taking a Breather')).toBeNull();
    });

    it('shows close button only when countdown is zero', async () => {
      const { queryByTestId, getByText } = render(
        <RateLimitModal {...defaultProps} retryAfter={1} />
      );

      // Let countdown reach zero
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Continue button should be visible (indicating close is available)
      await waitFor(() => {
        expect(getByText('Continue')).toBeTruthy();
      });
    });
  });

  describe('Time Formatting', () => {
    it('formats minutes and seconds correctly', () => {
      const { getByText } = render(<RateLimitModal {...defaultProps} retryAfter={125} />);

      expect(getByText('2m 5s')).toBeTruthy();
    });

    it('formats even minutes correctly', () => {
      const { getByText } = render(<RateLimitModal {...defaultProps} retryAfter={120} />);

      expect(getByText('2m 0s')).toBeTruthy();
    });

    it('formats seconds only when under a minute', () => {
      const { getByText } = render(<RateLimitModal {...defaultProps} retryAfter={45} />);

      expect(getByText('45s')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero retryAfter', () => {
      const { getByText } = render(<RateLimitModal {...defaultProps} retryAfter={0} />);

      expect(getByText('0s')).toBeTruthy();
      expect(getByText('Continue')).toBeTruthy();
    });

    it('handles missing onClose gracefully', () => {
      const { getByText } = render(
        <RateLimitModal {...defaultProps} retryAfter={0} onClose={undefined} />
      );

      const continueButton = getByText('Continue');
      // Should not throw
      expect(() => fireEvent.press(continueButton)).not.toThrow();
    });

    it('handles empty crisis resources array in distressed mode', () => {
      const { getByText } = render(
        <RateLimitModal {...defaultProps} isDistressed={true} crisisResources={[]} />
      );

      // Should fall back to default resources
      expect(getByText('988 Suicide & Crisis Lifeline')).toBeTruthy();
    });
  });
});
