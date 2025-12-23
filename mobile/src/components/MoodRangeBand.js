import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

/**
 * MoodRangeBand - Renders a shaded area showing daily min/max mood range
 *
 * Props:
 * - data: Array of { date, min, max, avg } objects
 * - width: Chart width
 * - height: Chart height
 * - paddingLeft: Left padding for y-axis labels
 * - paddingRight: Right padding
 * - yMin: Minimum y value (default 1)
 * - yMax: Maximum y value (default 5)
 * - color: Base color for the band (default '#6366F1')
 *
 * Memoized to prevent re-renders when chart data hasn't changed.
 */
const MoodRangeBand = memo(function MoodRangeBand({
  data,
  width,
  height,
  paddingLeft = 64,
  paddingRight = 16,
  paddingTop = 16,
  paddingBottom = 40,
  yMin = 1,
  yMax = 5,
  color = '#6366F1',
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate x position for each data point
  const getX = (index) => {
    if (data.length === 1) {
      return paddingLeft + chartWidth / 2;
    }
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  // Calculate y position for a value
  const getY = (value) => {
    const normalizedValue = (value - yMin) / (yMax - yMin);
    return paddingTop + chartHeight - (normalizedValue * chartHeight);
  };

  // Build the path for the range band (polygon)
  // Go forward along the max values, then backward along the min values
  let pathD = '';

  // Start at the first point's max
  pathD += `M ${getX(0)} ${getY(data[0].max)}`;

  // Draw along the top (max values)
  for (let i = 1; i < data.length; i++) {
    pathD += ` L ${getX(i)} ${getY(data[i].max)}`;
  }

  // Draw down to the last point's min
  pathD += ` L ${getX(data.length - 1)} ${getY(data[data.length - 1].min)}`;

  // Draw backward along the bottom (min values)
  for (let i = data.length - 2; i >= 0; i--) {
    pathD += ` L ${getX(i)} ${getY(data[i].min)}`;
  }

  // Close the path
  pathD += ' Z';

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="rangeBandGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        <Path
          d={pathD}
          fill="url(#rangeBandGradient)"
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.3"
        />
      </Svg>
    </View>
  );
});

/**
 * Calculate range data from check-ins grouped by date
 *
 * @param {Array} checkins - Array of check-in objects
 * @param {Object} moodRatingMap - Map of mood_rating to numeric values
 * @returns {Array} Array of { date, min, max, avg, count, hasVariance } objects
 */
export const calculateMoodRangeData = (checkins, moodRatingMap) => {
  if (!checkins || checkins.length === 0) {
    return [];
  }

  const groupedByDate = {};

  checkins.forEach((checkin) => {
    const dateKey = new Date(checkin.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const moodValue = moodRatingMap[checkin.mood_rating]?.value || 3;

    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = {
        date: dateKey,
        values: [],
        min: moodValue,
        max: moodValue,
      };
    }

    groupedByDate[dateKey].values.push(moodValue);
    groupedByDate[dateKey].min = Math.min(groupedByDate[dateKey].min, moodValue);
    groupedByDate[dateKey].max = Math.max(groupedByDate[dateKey].max, moodValue);
  });

  // Convert to array and calculate averages
  return Object.values(groupedByDate).map((day) => ({
    date: day.date,
    min: day.min,
    max: day.max,
    avg: day.values.reduce((sum, v) => sum + v, 0) / day.values.length,
    count: day.values.length,
    variance: day.max - day.min,
    hasVariance: day.max - day.min >= 2, // 2+ level swing
  }));
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default MoodRangeBand;
