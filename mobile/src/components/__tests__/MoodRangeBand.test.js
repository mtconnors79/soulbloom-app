/**
 * MoodRangeBand Component Tests
 *
 * Tests for:
 * - calculateMoodRangeData helper function
 * - Component rendering
 * - Edge cases
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import MoodRangeBand, { calculateMoodRangeData } from '../MoodRangeBand';

// Mock mood rating map (same as used in MoodScreen)
const MOOD_RATING_MAP = {
  great: { value: 5, emoji: '😊', label: 'Great', color: '#10B981' },
  good: { value: 4, emoji: '🙂', label: 'Good', color: '#6EE7B7' },
  okay: { value: 3, emoji: '😐', label: 'Okay', color: '#FCD34D' },
  not_good: { value: 2, emoji: '😔', label: 'Not Good', color: '#F97316' },
  terrible: { value: 1, emoji: '😢', label: 'Terrible', color: '#EF4444' },
};

describe('MoodRangeBand', () => {
  describe('calculateMoodRangeData', () => {
    it('should return correct min/max/avg for a single day with multiple check-ins', () => {
      const checkins = [
        { created_at: '2024-01-15T08:00:00Z', mood_rating: 'great' },   // value: 5
        { created_at: '2024-01-15T12:00:00Z', mood_rating: 'okay' },    // value: 3
        { created_at: '2024-01-15T18:00:00Z', mood_rating: 'not_good' }, // value: 2
      ];

      const result = calculateMoodRangeData(checkins, MOOD_RATING_MAP);

      expect(result).toHaveLength(1);
      expect(result[0].min).toBe(2);
      expect(result[0].max).toBe(5);
      expect(result[0].avg).toBe((5 + 3 + 2) / 3); // 3.33...
      expect(result[0].count).toBe(3);
    });

    it('should calculate correct average for multiple values', () => {
      const checkins = [
        { created_at: '2024-01-15T08:00:00Z', mood_rating: 'great' },   // 5
        { created_at: '2024-01-15T12:00:00Z', mood_rating: 'good' },    // 4
        { created_at: '2024-01-15T18:00:00Z', mood_rating: 'good' },    // 4
        { created_at: '2024-01-15T20:00:00Z', mood_rating: 'okay' },    // 3
      ];

      const result = calculateMoodRangeData(checkins, MOOD_RATING_MAP);

      expect(result[0].avg).toBe(4); // (5 + 4 + 4 + 3) / 4 = 16/4 = 4
    });

    it('should flag variance >= 2 levels as hasVariance: true', () => {
      const checkins = [
        { created_at: '2024-01-15T08:00:00Z', mood_rating: 'great' },     // 5
        { created_at: '2024-01-15T18:00:00Z', mood_rating: 'okay' },      // 3
      ];

      const result = calculateMoodRangeData(checkins, MOOD_RATING_MAP);

      expect(result[0].variance).toBe(2); // 5 - 3 = 2
      expect(result[0].hasVariance).toBe(true);
    });

    it('should flag variance of exactly 2 levels as hasVariance: true', () => {
      const checkins = [
        { created_at: '2024-01-15T08:00:00Z', mood_rating: 'good' },      // 4
        { created_at: '2024-01-15T18:00:00Z', mood_rating: 'not_good' },  // 2
      ];

      const result = calculateMoodRangeData(checkins, MOOD_RATING_MAP);

      expect(result[0].variance).toBe(2);
      expect(result[0].hasVariance).toBe(true);
    });

    it('should flag variance > 2 levels as hasVariance: true', () => {
      const checkins = [
        { created_at: '2024-01-15T08:00:00Z', mood_rating: 'great' },     // 5
        { created_at: '2024-01-15T18:00:00Z', mood_rating: 'terrible' },  // 1
      ];

      const result = calculateMoodRangeData(checkins, MOOD_RATING_MAP);

      expect(result[0].variance).toBe(4); // 5 - 1 = 4
      expect(result[0].hasVariance).toBe(true);
    });

    it('should NOT flag variance < 2 levels as hasVariance', () => {
      const checkins = [
        { created_at: '2024-01-15T08:00:00Z', mood_rating: 'great' },  // 5
        { created_at: '2024-01-15T18:00:00Z', mood_rating: 'good' },   // 4
      ];

      const result = calculateMoodRangeData(checkins, MOOD_RATING_MAP);

      expect(result[0].variance).toBe(1); // 5 - 4 = 1
      expect(result[0].hasVariance).toBe(false);
    });

    it('should NOT flag variance of 0 (single check-in or same mood)', () => {
      const checkins = [
        { created_at: '2024-01-15T08:00:00Z', mood_rating: 'good' },
        { created_at: '2024-01-15T18:00:00Z', mood_rating: 'good' },
      ];

      const result = calculateMoodRangeData(checkins, MOOD_RATING_MAP);

      expect(result[0].variance).toBe(0);
      expect(result[0].hasVariance).toBe(false);
    });

    it('should handle multiple days correctly', () => {
      const checkins = [
        // Day 1: High variance
        { created_at: '2024-01-15T08:00:00Z', mood_rating: 'great' },     // 5
        { created_at: '2024-01-15T18:00:00Z', mood_rating: 'terrible' },  // 1
        // Day 2: Low variance
        { created_at: '2024-01-16T08:00:00Z', mood_rating: 'good' },      // 4
        { created_at: '2024-01-16T18:00:00Z', mood_rating: 'okay' },      // 3
      ];

      const result = calculateMoodRangeData(checkins, MOOD_RATING_MAP);

      expect(result).toHaveLength(2);

      const day1 = result.find(d => d.date.includes('15'));
      const day2 = result.find(d => d.date.includes('16'));

      expect(day1.hasVariance).toBe(true);  // variance = 4
      expect(day2.hasVariance).toBe(false); // variance = 1
    });

    it('should return empty array for empty input', () => {
      const result = calculateMoodRangeData([], MOOD_RATING_MAP);
      expect(result).toEqual([]);
    });

    it('should return empty array for null input', () => {
      const result = calculateMoodRangeData(null, MOOD_RATING_MAP);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      const result = calculateMoodRangeData(undefined, MOOD_RATING_MAP);
      expect(result).toEqual([]);
    });

    it('should handle single check-in on a day', () => {
      const checkins = [
        { created_at: '2024-01-15T08:00:00Z', mood_rating: 'good' },
      ];

      const result = calculateMoodRangeData(checkins, MOOD_RATING_MAP);

      expect(result).toHaveLength(1);
      expect(result[0].min).toBe(4);
      expect(result[0].max).toBe(4);
      expect(result[0].avg).toBe(4);
      expect(result[0].count).toBe(1);
      expect(result[0].variance).toBe(0);
      expect(result[0].hasVariance).toBe(false);
    });

    it('should default to value 3 (okay) for unknown mood ratings', () => {
      const checkins = [
        { created_at: '2024-01-15T08:00:00Z', mood_rating: 'unknown_mood' },
      ];

      const result = calculateMoodRangeData(checkins, MOOD_RATING_MAP);

      expect(result[0].min).toBe(3);
      expect(result[0].max).toBe(3);
      expect(result[0].avg).toBe(3);
    });
  });

  describe('Component Rendering', () => {
    const defaultProps = {
      data: [
        { date: 'Jan 15', min: 2, max: 5, avg: 3.5, count: 3, variance: 3, hasVariance: true },
      ],
      width: 400,
      height: 300,
    };

    it('should render without crashing', () => {
      const { toJSON } = render(<MoodRangeBand {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render null for empty data', () => {
      const { toJSON } = render(
        <MoodRangeBand
          data={[]}
          width={400}
          height={300}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('should render null for null data', () => {
      const { toJSON } = render(
        <MoodRangeBand
          data={null}
          width={400}
          height={300}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('should render null for undefined data', () => {
      const { toJSON } = render(
        <MoodRangeBand
          data={undefined}
          width={400}
          height={300}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('should handle single data point', () => {
      const { toJSON } = render(
        <MoodRangeBand
          data={[{ date: 'Jan 15', min: 3, max: 4, avg: 3.5, count: 2, variance: 1, hasVariance: false }]}
          width={400}
          height={300}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should apply custom padding values', () => {
      const { toJSON } = render(
        <MoodRangeBand
          data={defaultProps.data}
          width={400}
          height={300}
          paddingLeft={100}
          paddingRight={50}
          paddingTop={30}
          paddingBottom={60}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should apply custom color', () => {
      const { toJSON } = render(
        <MoodRangeBand
          data={defaultProps.data}
          width={400}
          height={300}
          color="#FF5733"
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should handle multiple data points', () => {
      const multiDayData = [
        { date: 'Jan 15', min: 2, max: 5, avg: 3.5, count: 3, variance: 3, hasVariance: true },
        { date: 'Jan 16', min: 3, max: 4, avg: 3.5, count: 2, variance: 1, hasVariance: false },
        { date: 'Jan 17', min: 1, max: 4, avg: 2.5, count: 4, variance: 3, hasVariance: true },
      ];

      const { toJSON } = render(
        <MoodRangeBand
          data={multiDayData}
          width={400}
          height={300}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should use custom yMin and yMax', () => {
      const { toJSON } = render(
        <MoodRangeBand
          data={defaultProps.data}
          width={400}
          height={300}
          yMin={0}
          yMax={10}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });
});
