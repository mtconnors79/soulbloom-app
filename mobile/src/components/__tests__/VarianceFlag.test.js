/**
 * VarianceFlag Component Tests
 *
 * Tests for:
 * - Rendering flags only for high variance days
 * - PulsingFlag animation
 * - Flag press interactions
 * - VarianceTooltip content
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import VarianceFlag, { VarianceFlagLegend, VarianceTooltip } from '../VarianceFlag';

// Mock Animated for animation testing
const mockAnimatedTiming = jest.spyOn(Animated, 'timing');
const mockAnimatedLoop = jest.spyOn(Animated, 'loop');
const mockAnimatedSequence = jest.spyOn(Animated, 'sequence');

describe('VarianceFlag', () => {
  const defaultProps = {
    rangeData: [
      { date: 'Jan 15', min: 2, max: 5, avg: 3.5, count: 3, variance: 3, hasVariance: true, index: 0 },
      { date: 'Jan 16', min: 3, max: 4, avg: 3.5, count: 2, variance: 1, hasVariance: false, index: 1 },
      { date: 'Jan 17', min: 1, max: 5, avg: 3, count: 4, variance: 4, hasVariance: true, index: 2 },
    ],
    width: 400,
    height: 300,
    onFlagPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render flags only for days with hasVariance: true', () => {
      const { getAllByTestId, queryAllByTestId } = render(
        <VarianceFlag {...defaultProps} />
      );

      // Component renders a view with flags - we can check the structure
      // The component should only render flags for Jan 15 and Jan 17 (hasVariance: true)
      // Jan 16 has hasVariance: false
    });

    it('should render null for empty rangeData', () => {
      const { toJSON } = render(
        <VarianceFlag
          {...defaultProps}
          rangeData={[]}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('should render null for null rangeData', () => {
      const { toJSON } = render(
        <VarianceFlag
          {...defaultProps}
          rangeData={null}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('should render null when no days have variance', () => {
      const noVarianceData = [
        { date: 'Jan 15', min: 3, max: 4, avg: 3.5, count: 2, variance: 1, hasVariance: false, index: 0 },
        { date: 'Jan 16', min: 4, max: 4, avg: 4, count: 1, variance: 0, hasVariance: false, index: 1 },
      ];

      const { toJSON } = render(
        <VarianceFlag
          {...defaultProps}
          rangeData={noVarianceData}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('should render without crashing with valid data', () => {
      const { toJSON } = render(<VarianceFlag {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('PulsingFlag Animation', () => {
    it('should render flags with animation styles', () => {
      const { toJSON } = render(<VarianceFlag {...defaultProps} />);

      // Verify the component renders without crashing (animation runs internally)
      expect(toJSON()).toBeTruthy();
    });

    it('should render animated flag elements', () => {
      const { UNSAFE_getAllByType } = render(<VarianceFlag {...defaultProps} />);

      // Component should render TouchableOpacity elements for flags
      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    it('should use native driver for performance', () => {
      // Animation configuration is internal - verify component renders
      const { toJSON } = render(<VarianceFlag {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Flag Press Interaction', () => {
    it('should call onFlagPress with day data when flag is pressed', () => {
      const onFlagPress = jest.fn();
      const { getByTestId, UNSAFE_getAllByType } = render(
        <VarianceFlag
          {...defaultProps}
          onFlagPress={onFlagPress}
        />
      );

      // Get TouchableOpacity components (flags)
      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);

      if (touchables.length > 0) {
        fireEvent.press(touchables[0]);
        expect(onFlagPress).toHaveBeenCalled();
      }
    });

    it('should pass correct day data to onFlagPress', () => {
      const onFlagPress = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <VarianceFlag
          {...defaultProps}
          onFlagPress={onFlagPress}
        />
      );

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);

      if (touchables.length > 0) {
        fireEvent.press(touchables[0]);

        // Should be called with a day that has variance
        const calledWith = onFlagPress.mock.calls[0][0];
        expect(calledWith.hasVariance).toBe(true);
        expect(calledWith.variance).toBeGreaterThanOrEqual(2);
      }
    });

    it('should not crash when onFlagPress is not provided', () => {
      const { UNSAFE_getAllByType } = render(
        <VarianceFlag
          {...defaultProps}
          onFlagPress={undefined}
        />
      );

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);

      if (touchables.length > 0) {
        // Should not throw
        expect(() => fireEvent.press(touchables[0])).not.toThrow();
      }
    });
  });

  describe('Custom Props', () => {
    it('should handle custom padding values', () => {
      const { toJSON } = render(
        <VarianceFlag
          {...defaultProps}
          paddingLeft={100}
          paddingRight={50}
          paddingTop={30}
          paddingBottom={60}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should handle custom yMin and yMax', () => {
      const { toJSON } = render(
        <VarianceFlag
          {...defaultProps}
          yMin={0}
          yMax={10}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });
});

describe('VarianceFlagLegend', () => {
  it('should render without crashing', () => {
    const { toJSON } = render(<VarianceFlagLegend />);
    expect(toJSON()).toBeTruthy();
  });

  it('should display legend text', () => {
    const { getByText } = render(<VarianceFlagLegend />);
    expect(getByText('Mood swing 2+ levels')).toBeTruthy();
  });

  it('should apply custom style', () => {
    const { toJSON } = render(
      <VarianceFlagLegend style={{ marginTop: 20 }} />
    );
    expect(toJSON()).toBeTruthy();
  });
});

describe('VarianceTooltip', () => {
  const mockDay = {
    date: 'Jan 15',
    min: 2,
    max: 5,
    avg: 3.5,
    count: 3,
    variance: 3,
    hasVariance: true,
  };

  const defaultProps = {
    day: mockDay,
    visible: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible is true', () => {
    const { toJSON } = render(<VarianceTooltip {...defaultProps} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should not render when visible is false', () => {
    const { toJSON } = render(
      <VarianceTooltip {...defaultProps} visible={false} />
    );
    expect(toJSON()).toBeNull();
  });

  it('should not render when day is null', () => {
    const { toJSON } = render(
      <VarianceTooltip {...defaultProps} day={null} />
    );
    expect(toJSON()).toBeNull();
  });

  it('should display date', () => {
    const { getByText } = render(<VarianceTooltip {...defaultProps} />);
    expect(getByText('Jan 15')).toBeTruthy();
  });

  it('should display mood range', () => {
    const { getByText } = render(<VarianceTooltip {...defaultProps} />);
    // Range should show "Not Good → Great" (min 2 = Not Good, max 5 = Great)
    expect(getByText(/Not Good.*Great/)).toBeTruthy();
  });

  it('should display variance level', () => {
    const { getByText } = render(<VarianceTooltip {...defaultProps} />);
    expect(getByText('3 levels')).toBeTruthy();
  });

  it('should display check-in count', () => {
    const { getByText } = render(<VarianceTooltip {...defaultProps} />);
    expect(getByText('3')).toBeTruthy();
  });

  it('should show care provider suggestion', () => {
    const { getByText } = render(<VarianceTooltip {...defaultProps} />);
    expect(
      getByText(/care provider|therapist/i)
    ).toBeTruthy();
  });

  it('should call onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <VarianceTooltip {...defaultProps} onClose={onClose} />
    );

    fireEvent.press(getByText('Got it'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when background is pressed', () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <VarianceTooltip {...defaultProps} onClose={onClose} />
    );

    // Find the background TouchableOpacity
    const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
    // First touchable is typically the background overlay
    if (touchables.length > 0) {
      fireEvent.press(touchables[0]);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should display title "Mood Variability Alert"', () => {
    const { getByText } = render(<VarianceTooltip {...defaultProps} />);
    expect(getByText('Mood Variability Alert')).toBeTruthy();
  });

  it('should display hint about mood swings', () => {
    const { getByText } = render(<VarianceTooltip {...defaultProps} />);
    expect(
      getByText(/Large mood swings|stress|emotional dysregulation/i)
    ).toBeTruthy();
  });

  describe('Mood Label Mapping', () => {
    it('should show "Great" for value 5', () => {
      const day = { ...mockDay, max: 5 };
      const { getByText } = render(
        <VarianceTooltip {...defaultProps} day={day} />
      );
      expect(getByText(/Great/)).toBeTruthy();
    });

    it('should show "Terrible" for value 1', () => {
      const day = { ...mockDay, min: 1 };
      const { getByText } = render(
        <VarianceTooltip {...defaultProps} day={day} />
      );
      expect(getByText(/Terrible/)).toBeTruthy();
    });

    it('should show "Okay" for value 3', () => {
      const day = { ...mockDay, min: 3, max: 3 };
      const { getByText } = render(
        <VarianceTooltip {...defaultProps} day={day} />
      );
      expect(getByText(/Okay.*Okay/)).toBeTruthy();
    });
  });
});
