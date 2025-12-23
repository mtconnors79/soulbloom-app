import React, { useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

/**
 * PulsingFlag - Animated flag with gentle pulse effect
 */
const PulsingFlag = ({ onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.flagIcon,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Icon name="warning" size={14} color="#F59E0B" />
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * VarianceFlag - Warning indicator for days with significant mood swings (2+ levels)
 *
 * Props:
 * - rangeData: Array from calculateMoodRangeData with hasVariance flag
 * - width: Chart width
 * - height: Chart height
 * - paddingLeft: Left padding for y-axis labels
 * - paddingRight: Right padding
 * - paddingTop: Top padding
 * - onFlagPress: Callback when a flag is pressed (receives date info)
 *
 * Memoized to prevent re-renders when chart dimensions/data haven't changed.
 */
const VarianceFlag = memo(function VarianceFlag({
  rangeData,
  width,
  height,
  paddingLeft = 64,
  paddingRight = 16,
  paddingTop = 16,
  paddingBottom = 40,
  yMin = 1,
  yMax = 5,
  onFlagPress,
}) => {
  if (!rangeData || rangeData.length === 0) {
    return null;
  }

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Get flags only for days with variance >= 2
  const flagData = rangeData
    .map((day, index) => ({ ...day, index }))
    .filter((day) => day.hasVariance);

  if (flagData.length === 0) {
    return null;
  }

  // Calculate x position for each data point
  const getX = (index) => {
    if (rangeData.length === 1) {
      return paddingLeft + chartWidth / 2;
    }
    return paddingLeft + (index / (rangeData.length - 1)) * chartWidth;
  };

  // Calculate y position for a value
  const getY = (value) => {
    const normalizedValue = (value - yMin) / (yMax - yMin);
    return paddingTop + chartHeight - (normalizedValue * chartHeight);
  };

  const flagSize = 20;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="box-none">
      {flagData.map((day) => {
        const x = getX(day.index);
        const y = getY(day.max) - flagSize - 4; // Position above the max point

        return (
          <View
            key={day.date}
            style={[
              styles.flagContainer,
              {
                left: x - flagSize / 2,
                top: y,
              },
            ]}
          >
            <PulsingFlag onPress={() => onFlagPress && onFlagPress(day)} />
          </View>
        );
      })}
    </View>
  );
});

/**
 * VarianceFlagLegend - Legend item explaining the variance flag
 * Memoized since it's a static display component.
 */
export const VarianceFlagLegend = memo(function VarianceFlagLegend({ style }) {
  return (
    <View style={[styles.legendContainer, style]}>
      <View style={styles.legendIcon}>
        <Icon name="warning" size={12} color="#F59E0B" />
      </View>
      <Text style={styles.legendText}>Mood swing 2+ levels</Text>
    </View>
  );
});

/**
 * VarianceTooltip - Tooltip shown when a variance flag is pressed
 */
export const VarianceTooltip = ({ day, visible, onClose }) => {
  if (!visible || !day) {
    return null;
  }

  const getMoodLabel = (value) => {
    if (value >= 5) return 'Great';
    if (value >= 4) return 'Good';
    if (value >= 3) return 'Okay';
    if (value >= 2) return 'Not Good';
    return 'Terrible';
  };

  return (
    <View style={styles.tooltipOverlay}>
      <TouchableOpacity style={styles.tooltipBackground} onPress={onClose} activeOpacity={1}>
        <View style={styles.tooltipContainer}>
          <View style={styles.tooltipHeader}>
            <Icon name="warning" size={20} color="#F59E0B" />
            <Text style={styles.tooltipTitle}>Mood Variability Alert</Text>
          </View>
          <Text style={styles.tooltipDate}>{day.date}</Text>
          <View style={styles.tooltipStats}>
            <View style={styles.tooltipStatRow}>
              <Text style={styles.tooltipLabel}>Range:</Text>
              <Text style={styles.tooltipValue}>
                {getMoodLabel(day.min)} → {getMoodLabel(day.max)}
              </Text>
            </View>
            <View style={styles.tooltipStatRow}>
              <Text style={styles.tooltipLabel}>Swing:</Text>
              <Text style={[styles.tooltipValue, styles.varianceValue]}>
                {day.variance} levels
              </Text>
            </View>
            <View style={styles.tooltipStatRow}>
              <Text style={styles.tooltipLabel}>Check-ins:</Text>
              <Text style={styles.tooltipValue}>{day.count}</Text>
            </View>
          </View>
          <Text style={styles.tooltipHint}>
            Large mood swings can indicate stress or emotional dysregulation. Consider journaling or reaching out for support.
          </Text>

          {/* Care Provider Suggestion */}
          <View style={styles.careProviderBox}>
            <Icon name="medical-outline" size={18} color="#6366F1" />
            <Text style={styles.careProviderText}>
              Consider sharing this pattern with your care provider or therapist.
            </Text>
          </View>

          <TouchableOpacity style={styles.tooltipClose} onPress={onClose}>
            <Text style={styles.tooltipCloseText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  flagContainer: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  // Legend styles
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#6B7280',
  },
  // Tooltip styles
  tooltipOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  tooltipBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  tooltipDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  tooltipStats: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  tooltipStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tooltipLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  varianceValue: {
    color: '#F59E0B',
  },
  tooltipHint: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  careProviderBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  careProviderText: {
    flex: 1,
    fontSize: 13,
    color: '#4F46E5',
    lineHeight: 18,
    fontWeight: '500',
  },
  tooltipClose: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 10,
  },
  tooltipCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default VarianceFlag;
