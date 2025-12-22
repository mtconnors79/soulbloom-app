import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Switch,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/Ionicons';
import { moodAPI, checkinAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import MoodRangeBand, { calculateMoodRangeData } from '../../components/MoodRangeBand';
import VarianceFlag, { VarianceFlagLegend, VarianceTooltip } from '../../components/VarianceFlag';

const screenWidth = Dimensions.get('window').width;

const MOOD_OPTIONS = [
  { value: 1.0, emoji: '😄', label: 'Amazing', color: '#10B981' },
  { value: 0.5, emoji: '🙂', label: 'Good', color: '#6366F1' },
  { value: 0.0, emoji: '😐', label: 'Okay', color: '#F59E0B' },
  { value: -0.5, emoji: '😔', label: 'Low', color: '#F97316' },
  { value: -1.0, emoji: '😢', label: 'Difficult', color: '#EF4444' },
];

const TIMEFRAME_OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
];

const MOOD_RATING_MAP = {
  great: { value: 5, color: '#10B981', label: 'Great', emoji: '😄' },
  good: { value: 4, color: '#34D399', label: 'Good', emoji: '🙂' },
  okay: { value: 3, color: '#F59E0B', label: 'Okay', emoji: '😐' },
  not_good: { value: 2, color: '#F97316', label: 'Not Good', emoji: '😔' },
  terrible: { value: 1, color: '#EF4444', label: 'Terrible', emoji: '😢' },
};

const EMOTION_COLORS = {
  happy: '#10B981',
  calm: '#3B82F6',
  energetic: '#F59E0B',
  anxious: '#F97316',
  stressed: '#EF4444',
  sad: '#8B5CF6',
  angry: '#DC2626',
  tired: '#6B7280',
};

// Colors for different data sources
const CHECKIN_COLOR = '#6366F1'; // Indigo for check-ins
const QUICK_MOOD_COLOR = '#EC4899'; // Pink for quick moods

const MoodScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeframe, setTimeframe] = useState(7);

  // View mode states
  const [detailedMoodView, setDetailedMoodView] = useState(false);
  const [detailedStressView, setDetailedStressView] = useState(false);
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState(null);

  // Detailed view sub-options
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [showVarianceTooltip, setShowVarianceTooltip] = useState(false);
  const [selectedVarianceDay, setSelectedVarianceDay] = useState(null);
  const [showDetailedInfoTooltip, setShowDetailedInfoTooltip] = useState(false);

  // Data states
  const [moodStats, setMoodStats] = useState(null);
  const [checkinStats, setCheckinStats] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [recentMoods, setRecentMoods] = useState([]);

  const getDateRange = useCallback((days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const dateRange = getDateRange(timeframe);

      const [moodStatsRes, checkinStatsRes, checkinsRes, moodsRes] = await Promise.all([
        moodAPI.stats({ days: timeframe }),
        checkinAPI.stats(dateRange),
        checkinAPI.list({ ...dateRange, limit: 100 }),
        moodAPI.list({ ...dateRange, limit: 100 }),
      ]);

      setMoodStats(moodStatsRes.data?.stats || null);
      setCheckinStats(checkinStatsRes.data?.stats || null);
      setCheckins(checkinsRes.data?.checkins || []);
      setRecentMoods(moodsRes.data?.moodEntries || []);
    } catch (error) {
      console.error('Error fetching mood data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe, getDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleAddMood = async (moodOption) => {
    setSubmitting(true);
    try {
      await moodAPI.create({
        sentiment_score: moodOption.value,
        sentiment_label: moodOption.label.toLowerCase(),
        check_in_date: new Date().toISOString(),
      });

      setShowAddModal(false);
      fetchData();
      Alert.alert('Mood Logged', `You're feeling ${moodOption.label.toLowerCase()} today.`);
    } catch (error) {
      console.error('Error adding mood:', error);
      Alert.alert('Error', 'Failed to log mood. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get all mood entries grouped by date for modal display
  const getMoodEntriesByDate = useCallback(() => {
    const entriesByDate = {};

    // Add check-ins
    if (checkins && checkins.length > 0) {
      checkins.forEach((checkin) => {
        const dateKey = new Date(checkin.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const moodValue = MOOD_RATING_MAP[checkin.mood_rating]?.value || 3;
        const moodInfo = MOOD_RATING_MAP[checkin.mood_rating];

        if (!entriesByDate[dateKey]) {
          entriesByDate[dateKey] = [];
        }
        entriesByDate[dateKey].push({
          type: 'check-in',
          time: new Date(checkin.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          moodValue,
          moodLabel: moodInfo?.label || checkin.mood_rating,
          emoji: moodInfo?.emoji || '😐',
          color: moodInfo?.color || '#6B7280',
          stressLevel: checkin.stress_level,
          timestamp: new Date(checkin.created_at),
        });
      });
    }

    // Add quick moods
    if (recentMoods && recentMoods.length > 0) {
      recentMoods.forEach((mood) => {
        const dateKey = new Date(mood.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const moodValue = Math.round((parseFloat(mood.sentiment_score) + 1) * 2) + 1;
        const moodOption = MOOD_OPTIONS.find((m) => {
          const diff = Math.abs(m.value - parseFloat(mood.sentiment_score));
          return diff <= 0.25;
        }) || MOOD_OPTIONS[2];

        if (!entriesByDate[dateKey]) {
          entriesByDate[dateKey] = [];
        }
        entriesByDate[dateKey].push({
          type: 'quick-mood',
          time: new Date(mood.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          moodValue,
          moodLabel: mood.sentiment_label,
          emoji: moodOption.emoji,
          color: moodOption.color,
          timestamp: new Date(mood.created_at),
        });
      });
    }

    // Sort entries within each day by timestamp
    Object.keys(entriesByDate).forEach((date) => {
      entriesByDate[date].sort((a, b) => a.timestamp - b.timestamp);
    });

    return entriesByDate;
  }, [checkins, recentMoods]);

  // Process mood data for summary view (daily averages)
  const getMoodTrendDataSummary = useCallback(() => {
    const hasCheckins = checkins && checkins.length > 0;
    const hasMoods = recentMoods && recentMoods.length > 0;

    if (!hasCheckins && !hasMoods) {
      return null;
    }

    const moodByDate = {};

    if (hasCheckins) {
      checkins.forEach((checkin) => {
        const date = new Date(checkin.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const moodValue = MOOD_RATING_MAP[checkin.mood_rating]?.value || 3;

        if (!moodByDate[date]) {
          moodByDate[date] = { total: 0, count: 0 };
        }
        moodByDate[date].total += moodValue;
        moodByDate[date].count += 1;
      });
    }

    if (hasMoods) {
      recentMoods.forEach((mood) => {
        const date = new Date(mood.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const moodValue = Math.round((parseFloat(mood.sentiment_score) + 1) * 2) + 1;

        if (!moodByDate[date]) {
          moodByDate[date] = { total: 0, count: 0 };
        }
        moodByDate[date].total += moodValue;
        moodByDate[date].count += 1;
      });
    }

    const dates = Object.keys(moodByDate).slice(-7);
    const values = dates.map((date) => moodByDate[date].total / moodByDate[date].count);

    if (dates.length === 0) return null;

    return {
      labels: dates,
      datasets: [{ data: values }],
      dateKeys: dates, // For tappable functionality
    };
  }, [checkins, recentMoods]);

  // Process mood data for detailed view (individual entries)
  const getMoodTrendDataDetailed = useCallback(() => {
    const hasCheckins = checkins && checkins.length > 0;
    const hasMoods = recentMoods && recentMoods.length > 0;

    if (!hasCheckins && !hasMoods) {
      return null;
    }

    // Collect all entries with timestamps
    const allEntries = [];

    if (hasCheckins) {
      checkins.forEach((checkin) => {
        const moodValue = MOOD_RATING_MAP[checkin.mood_rating]?.value || 3;
        allEntries.push({
          timestamp: new Date(checkin.created_at),
          value: moodValue,
          type: 'check-in',
        });
      });
    }

    if (hasMoods) {
      recentMoods.forEach((mood) => {
        const moodValue = Math.round((parseFloat(mood.sentiment_score) + 1) * 2) + 1;
        allEntries.push({
          timestamp: new Date(mood.created_at),
          value: moodValue,
          type: 'quick-mood',
        });
      });
    }

    // Sort by timestamp
    allEntries.sort((a, b) => a.timestamp - b.timestamp);

    // Take last 10 entries for detailed view to avoid overcrowding
    const recentEntries = allEntries.slice(-10);

    if (recentEntries.length === 0) return null;

    const labels = recentEntries.map((e) =>
      e.timestamp.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) +
      '\n' +
      e.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '')
    );
    const values = recentEntries.map((e) => e.value);
    const types = recentEntries.map((e) => e.type);

    return {
      labels,
      datasets: [{ data: values }],
      types, // For color coding
    };
  }, [checkins, recentMoods]);

  // Calculate mood range data for detailed view (min/max/avg per day)
  const getMoodRangeData = useCallback(() => {
    if (!checkins || checkins.length === 0) {
      return [];
    }
    return calculateMoodRangeData(checkins, MOOD_RATING_MAP);
  }, [checkins]);

  // Get detailed view data - either range bands (default) or all entries
  const getDetailedMoodData = useCallback(() => {
    if (showAllEntries) {
      // Return all individual entries
      return getMoodTrendDataDetailed();
    }

    // Return daily averages with range data for band visualization
    const rangeData = getMoodRangeData();
    if (rangeData.length === 0) return null;

    const labels = rangeData.map((d) => d.date);
    const values = rangeData.map((d) => d.avg);

    return {
      labels,
      datasets: [{ data: values }],
      rangeData, // Include for range band rendering
    };
  }, [showAllEntries, getMoodTrendDataDetailed, getMoodRangeData]);

  // Handle variance flag press
  const handleVarianceFlagPress = useCallback((day) => {
    setSelectedVarianceDay(day);
    setShowVarianceTooltip(true);
  }, []);

  // Handle tapping on a summary data point
  const handleSummaryPointTap = (dateKey) => {
    const entriesByDate = getMoodEntriesByDate();
    const entries = entriesByDate[dateKey];

    if (entries && entries.length > 0) {
      setSelectedDayData({ date: dateKey, entries });
      setShowDayDetailsModal(true);
    }
  };

  // Process stress data for summary view
  const getStressTrendDataSummary = useCallback(() => {
    if (!checkins || checkins.length === 0) {
      return null;
    }

    const stressByDate = {};
    checkins.forEach((checkin) => {
      const date = new Date(checkin.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (!stressByDate[date]) {
        stressByDate[date] = { total: 0, count: 0 };
      }
      stressByDate[date].total += checkin.stress_level || 5;
      stressByDate[date].count += 1;
    });

    const dates = Object.keys(stressByDate).slice(-7);
    const values = dates.map((date) => stressByDate[date].total / stressByDate[date].count);

    if (dates.length === 0) return null;

    return {
      labels: dates,
      datasets: [{ data: values }],
    };
  }, [checkins]);

  // Process stress data for detailed view
  const getStressTrendDataDetailed = useCallback(() => {
    if (!checkins || checkins.length === 0) {
      return null;
    }

    // Sort by timestamp
    const sortedCheckins = [...checkins].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Take last 10 entries
    const recentCheckins = sortedCheckins.slice(-10);

    if (recentCheckins.length === 0) return null;

    const labels = recentCheckins.map((c) => {
      const date = new Date(c.created_at);
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) +
        '\n' +
        date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '');
    });
    const values = recentCheckins.map((c) => c.stress_level || 5);

    return {
      labels,
      datasets: [{ data: values }],
    };
  }, [checkins]);

  // Process emotion distribution for bar chart
  const getEmotionChartData = useCallback(() => {
    if (!checkinStats?.emotionDistribution) {
      return null;
    }

    const emotions = Object.entries(checkinStats.emotionDistribution);
    if (emotions.length === 0) return null;

    emotions.sort((a, b) => b[1] - a[1]);
    const topEmotions = emotions.slice(0, 6);

    return {
      labels: topEmotions.map(([emotion]) => emotion.charAt(0).toUpperCase() + emotion.slice(1)),
      datasets: [{ data: topEmotions.map(([, count]) => count) }],
      colors: topEmotions.map(([emotion]) => () => EMOTION_COLORS[emotion] || '#6B7280'),
    };
  }, [checkinStats]);

  const getMoodColor = (avgMood) => {
    if (avgMood >= 4) return '#10B981';
    if (avgMood >= 3) return '#F59E0B';
    return '#EF4444';
  };

  const getStressColor = (avgStress) => {
    if (avgStress <= 3) return '#10B981';
    if (avgStress <= 6) return '#F59E0B';
    return '#EF4444';
  };

  const getMoodLabel = (avgMood) => {
    if (avgMood >= 4.5) return 'Great';
    if (avgMood >= 3.5) return 'Good';
    if (avgMood >= 2.5) return 'Okay';
    if (avgMood >= 1.5) return 'Not Good';
    return 'Difficult';
  };

  const getStressLabel = (avgStress) => {
    if (avgStress <= 3) return 'Low';
    if (avgStress <= 6) return 'Moderate';
    if (avgStress <= 8) return 'High';
    return 'Very High';
  };

  const calculateAvgMood = () => {
    let totalScore = 0;
    let totalCount = 0;

    if (checkinStats?.moodDistribution) {
      const moodDist = checkinStats.moodDistribution;
      Object.entries(moodDist).forEach(([mood, count]) => {
        totalScore += (MOOD_RATING_MAP[mood]?.value || 3) * count;
        totalCount += count;
      });
    }

    if (recentMoods && recentMoods.length > 0) {
      recentMoods.forEach((mood) => {
        const moodValue = Math.round((parseFloat(mood.sentiment_score) + 1) * 2) + 1;
        totalScore += moodValue;
        totalCount += 1;
      });
    }

    return totalCount > 0 ? totalScore / totalCount : null;
  };

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    decimalPlaces: 1,
    propsForLabels: {
      fontSize: 9,
    },
  };

  const stressChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
  };

  const moodTrendData = detailedMoodView ? getDetailedMoodData() : getMoodTrendDataSummary();
  const rangeData = detailedMoodView && !showAllEntries ? getMoodRangeData() : [];
  const stressTrendData = detailedStressView ? getStressTrendDataDetailed() : getStressTrendDataSummary();
  const emotionChartData = getEmotionChartData();
  const avgMood = calculateAvgMood();
  const avgStress = checkinStats?.averageStressLevel;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Timeframe Toggle */}
        <View style={styles.timeframeContainer}>
          {TIMEFRAME_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.timeframeButton,
                timeframe === option.value && styles.timeframeButtonActive,
              ]}
              onPress={() => setTimeframe(option.value)}
            >
              <Text
                style={[
                  styles.timeframeText,
                  timeframe === option.value && styles.timeframeTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Icon name="happy-outline" size={24} color={avgMood ? getMoodColor(avgMood) : '#6B7280'} />
            </View>
            <Text style={styles.summaryLabel}>Avg Mood</Text>
            <Text style={[styles.summaryValue, { color: avgMood ? getMoodColor(avgMood) : '#6B7280' }]}>
              {avgMood ? avgMood.toFixed(1) : '-'}
            </Text>
            <Text style={styles.summarySubtext}>
              {avgMood ? getMoodLabel(avgMood) : 'No data'}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Icon name="pulse-outline" size={24} color={avgStress ? getStressColor(avgStress) : '#6B7280'} />
            </View>
            <Text style={styles.summaryLabel}>Avg Stress</Text>
            <Text style={[styles.summaryValue, { color: avgStress ? getStressColor(avgStress) : '#6B7280' }]}>
              {avgStress ? avgStress.toFixed(1) : '-'}
            </Text>
            <Text style={styles.summarySubtext}>
              {avgStress ? getStressLabel(avgStress) : 'No data'}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Icon name="clipboard-outline" size={24} color="#6366F1" />
            </View>
            <Text style={styles.summaryLabel}>Total Entries</Text>
            <Text style={[styles.summaryValue, { color: '#6366F1' }]}>
              {(checkinStats?.totalCheckins || 0) + (recentMoods?.length || 0)}
            </Text>
            <Text style={styles.summarySubtext}>
              Last {timeframe} days
            </Text>
          </View>
        </View>

        {/* Mood Trend Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <View style={styles.chartHeader}>
              <Icon name="trending-up" size={20} color="#6366F1" />
              <Text style={styles.chartTitle}>Combined Mood Trend</Text>
            </View>
            <View style={styles.viewToggleWithInfo}>
              <TouchableOpacity
                style={styles.infoIconButton}
                onPress={() => setShowDetailedInfoTooltip(true)}
              >
                <Icon name="information-circle-outline" size={18} color="#9CA3AF" />
              </TouchableOpacity>
              <Text style={styles.viewToggleLabel}>Detailed</Text>
              <Switch
                value={detailedMoodView}
                onValueChange={(value) => {
                  setDetailedMoodView(value);
                  if (!value) setShowAllEntries(false); // Reset sub-toggle when disabling detailed
                }}
                trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                thumbColor={detailedMoodView ? '#6366F1' : '#9CA3AF'}
                style={styles.switch}
              />
            </View>
          </View>

          {/* Show All Entries sub-toggle - only visible in Detailed mode */}
          {detailedMoodView && (
            <View style={styles.subToggleRow}>
              <Text style={styles.subToggleHint}>
                {showAllEntries ? 'Showing all entries' : 'Showing daily range bands'}
              </Text>
              <View style={styles.viewToggle}>
                <Text style={styles.viewToggleLabel}>All Entries</Text>
                <Switch
                  value={showAllEntries}
                  onValueChange={setShowAllEntries}
                  trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
                  thumbColor={showAllEntries ? '#8B5CF6' : '#9CA3AF'}
                  style={styles.switch}
                />
              </View>
            </View>
          )}

          {!detailedMoodView && moodTrendData && (
            <Text style={styles.chartHint}>Tap a point to see day's entries</Text>
          )}

          {moodTrendData ? (
            <View style={styles.chartContainer}>
              {/* Range Band Overlay - shown in detailed mode without "All Entries" */}
              {detailedMoodView && !showAllEntries && rangeData.length > 0 && (
                <MoodRangeBand
                  data={rangeData}
                  width={screenWidth - 48}
                  height={180}
                  paddingLeft={64}
                  paddingRight={16}
                  paddingTop={16}
                  paddingBottom={40}
                  yMin={1}
                  yMax={5}
                  color="#6366F1"
                />
              )}

              <TouchableOpacity
                activeOpacity={detailedMoodView ? 1 : 0.7}
                onPress={() => {
                  if (!detailedMoodView && moodTrendData.dateKeys) {
                    // Show picker for which day to view (simplified: show most recent)
                    const lastDate = moodTrendData.dateKeys[moodTrendData.dateKeys.length - 1];
                    handleSummaryPointTap(lastDate);
                  }
                }}
              >
                <LineChart
                  data={moodTrendData}
                  width={screenWidth - 48}
                  height={180}
                  chartConfig={{
                    ...chartConfig,
                    propsForDots: {
                      r: detailedMoodView ? '5' : '6',
                      strokeWidth: '2',
                      stroke: '#6366F1',
                    },
                  }}
                  bezier
                  style={styles.chart}
                  yAxisSuffix=""
                  yAxisInterval={1}
                  fromZero={false}
                  segments={4}
                  onDataPointClick={({ index }) => {
                    if (!detailedMoodView && moodTrendData.dateKeys) {
                      const dateKey = moodTrendData.dateKeys[index];
                      handleSummaryPointTap(dateKey);
                    }
                  }}
                />
              </TouchableOpacity>

              {/* Variance Flags - shown in detailed mode without "All Entries" */}
              {detailedMoodView && !showAllEntries && rangeData.length > 0 && (
                <VarianceFlag
                  rangeData={rangeData}
                  width={screenWidth - 48}
                  height={180}
                  paddingLeft={64}
                  paddingRight={16}
                  paddingTop={16}
                  paddingBottom={40}
                  yMin={1}
                  yMax={5}
                  onFlagPress={handleVarianceFlagPress}
                />
              )}
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Icon name="bar-chart-outline" size={40} color="#D1D5DB" />
              <Text style={styles.noDataText}>No mood data yet</Text>
            </View>
          )}

          {/* Legend */}
          <View style={styles.chartLegend}>
            {detailedMoodView && showAllEntries ? (
              // All Entries mode: show source legend
              <>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CHECKIN_COLOR }]} />
                  <Text style={styles.legendText}>Check-ins</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: QUICK_MOOD_COLOR }]} />
                  <Text style={styles.legendText}>Quick Moods</Text>
                </View>
              </>
            ) : detailedMoodView && !showAllEntries ? (
              // Range Bands mode: show range and variance legend
              <>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#6366F1', opacity: 0.3 }]} />
                  <Text style={styles.legendText}>Daily Range</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
                  <Text style={styles.legendText}>Daily Avg</Text>
                </View>
                <VarianceFlagLegend />
              </>
            ) : (
              // Summary mode: show mood scale
              <>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>5 = Great</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendText}>3 = Okay</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendText}>1 = Terrible</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Stress Level Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <View style={styles.chartHeader}>
              <Icon name="pulse" size={20} color="#EF4444" />
              <Text style={styles.chartTitle}>Stress Level Trend</Text>
            </View>
            <View style={styles.viewToggle}>
              <Text style={styles.viewToggleLabel}>Details</Text>
              <Switch
                value={detailedStressView}
                onValueChange={setDetailedStressView}
                trackColor={{ false: '#E5E7EB', true: '#FECACA' }}
                thumbColor={detailedStressView ? '#EF4444' : '#9CA3AF'}
                style={styles.switch}
              />
            </View>
          </View>

          {stressTrendData ? (
            <LineChart
              data={stressTrendData}
              width={screenWidth - 48}
              height={180}
              chartConfig={{
                ...stressChartConfig,
                propsForDots: {
                  r: detailedStressView ? '5' : '6',
                  strokeWidth: '2',
                  stroke: '#EF4444',
                },
              }}
              bezier
              style={styles.chart}
              yAxisSuffix=""
              yAxisInterval={1}
              fromZero
              segments={4}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Icon name="pulse-outline" size={40} color="#D1D5DB" />
              <Text style={styles.noDataText}>No stress data yet</Text>
            </View>
          )}
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>1-3 Low</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>4-6 Moderate</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>7-10 High</Text>
            </View>
          </View>
        </View>

        {/* Emotion Distribution Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Icon name="heart" size={20} color="#EC4899" />
            <Text style={styles.chartTitle}>Emotion Distribution</Text>
          </View>
          {emotionChartData ? (
            <BarChart
              data={emotionChartData}
              width={screenWidth - 48}
              height={200}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(236, 72, 153, ${opacity})`,
              }}
              style={styles.chart}
              showValuesOnTopOfBars
              fromZero
              withCustomBarColorFromData
              flatColor
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Icon name="heart-outline" size={40} color="#D1D5DB" />
              <Text style={styles.noDataText}>No emotion data yet</Text>
            </View>
          )}
          {emotionChartData && (
            <View style={styles.emotionLegendContainer}>
              {Object.entries(EMOTION_COLORS).slice(0, 4).map(([emotion, color]) => (
                <View key={emotion} style={styles.emotionLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendText}>{emotion.charAt(0).toUpperCase() + emotion.slice(1)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Mood Distribution */}
        {checkinStats?.moodDistribution && Object.keys(checkinStats.moodDistribution).length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Icon name="pie-chart" size={20} color="#6366F1" />
              <Text style={styles.chartTitle}>Mood Breakdown</Text>
            </View>
            <View style={styles.moodBreakdownContainer}>
              {Object.entries(checkinStats.moodDistribution).map(([mood, count]) => {
                const moodInfo = MOOD_RATING_MAP[mood];
                const total = checkinStats.totalCheckins || 1;
                const percentage = Math.round((count / total) * 100);

                return (
                  <View key={mood} style={styles.moodBreakdownItem}>
                    <View style={styles.moodBreakdownHeader}>
                      <Text style={styles.moodBreakdownLabel}>{moodInfo?.label || mood}</Text>
                      <Text style={styles.moodBreakdownCount}>{count}</Text>
                    </View>
                    <View style={styles.moodBreakdownBarBg}>
                      <View
                        style={[
                          styles.moodBreakdownBar,
                          { width: `${percentage}%`, backgroundColor: moodInfo?.color || '#6B7280' },
                        ]}
                      />
                    </View>
                    <Text style={styles.moodBreakdownPercent}>{percentage}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Quick Moods */}
        {recentMoods.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Icon name="time" size={20} color="#6366F1" />
              <Text style={styles.chartTitle}>Recent Quick Moods</Text>
            </View>
            {recentMoods.slice(0, 5).map((mood) => {
              const moodOption = MOOD_OPTIONS.find((m) => {
                const diff = Math.abs(m.value - parseFloat(mood.sentiment_score));
                return diff <= 0.25;
              }) || MOOD_OPTIONS[2];

              return (
                <View key={mood.id} style={styles.recentMoodItem}>
                  <View style={[styles.recentMoodEmoji, { backgroundColor: moodOption.color + '20' }]}>
                    <Text style={styles.recentMoodEmojiText}>{moodOption.emoji}</Text>
                  </View>
                  <View style={styles.recentMoodContent}>
                    <Text style={styles.recentMoodLabel}>{mood.sentiment_label}</Text>
                    <Text style={styles.recentMoodDate}>
                      {new Date(mood.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={[styles.recentMoodIndicator, { backgroundColor: moodOption.color }]} />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Mood FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Mood Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>How are you feeling?</Text>
            <Text style={styles.modalSubtitle}>Tap to log your current mood</Text>

            <View style={styles.moodGrid}>
              {MOOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.moodOption}
                  onPress={() => handleAddMood(option)}
                  disabled={submitting}
                >
                  <View style={[styles.moodOptionCircle, { backgroundColor: option.color + '20' }]}>
                    <Text style={styles.moodOptionEmoji}>{option.emoji}</Text>
                  </View>
                  <Text style={[styles.moodOptionLabel, { color: option.color }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {submitting && (
              <ActivityIndicator style={styles.modalLoader} color="#6366F1" />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Day Details Modal */}
      <Modal
        visible={showDayDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDayDetailsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDayDetailsModal(false)}
        >
          <View style={styles.dayDetailsModal} onStartShouldSetResponder={() => true}>
            <View style={styles.dayDetailsHeader}>
              <Text style={styles.dayDetailsTitle}>{selectedDayData?.date}</Text>
              <Text style={styles.dayDetailsSubtitle}>
                {selectedDayData?.entries?.length || 0} {selectedDayData?.entries?.length === 1 ? 'entry' : 'entries'}
              </Text>
            </View>

            <ScrollView style={styles.dayDetailsList} showsVerticalScrollIndicator={false}>
              {selectedDayData?.entries?.map((entry, index) => (
                <View key={index} style={styles.dayDetailsItem}>
                  <View style={styles.dayDetailsLeft}>
                    <View style={[styles.dayDetailsEmoji, { backgroundColor: entry.color + '20' }]}>
                      <Text style={styles.dayDetailsEmojiText}>{entry.emoji}</Text>
                    </View>
                    <View style={styles.dayDetailsInfo}>
                      <View style={styles.dayDetailsLabelRow}>
                        <Text style={styles.dayDetailsLabel}>{entry.moodLabel}</Text>
                        <View style={[
                          styles.sourceTag,
                          { backgroundColor: entry.type === 'check-in' ? CHECKIN_COLOR + '20' : QUICK_MOOD_COLOR + '20' }
                        ]}>
                          <Text style={[
                            styles.sourceTagText,
                            { color: entry.type === 'check-in' ? CHECKIN_COLOR : QUICK_MOOD_COLOR }
                          ]}>
                            {entry.type === 'check-in' ? 'Check-in' : 'Quick Mood'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.dayDetailsTime}>{entry.time}</Text>
                      {entry.stressLevel && (
                        <Text style={styles.dayDetailsStress}>Stress: {entry.stressLevel}/10</Text>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.dayDetailsMoodValue, { color: entry.color }]}>
                    {entry.moodValue}/5
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.dayDetailsClose}
              onPress={() => setShowDayDetailsModal(false)}
            >
              <Text style={styles.dayDetailsCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Variance Tooltip */}
      <VarianceTooltip
        day={selectedVarianceDay}
        visible={showVarianceTooltip}
        onClose={() => {
          setShowVarianceTooltip(false);
          setSelectedVarianceDay(null);
        }}
      />

      {/* Detailed View Info Tooltip */}
      <Modal
        visible={showDetailedInfoTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailedInfoTooltip(false)}
      >
        <TouchableOpacity
          style={styles.infoTooltipOverlay}
          activeOpacity={1}
          onPress={() => setShowDetailedInfoTooltip(false)}
        >
          <View style={styles.infoTooltipContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.infoTooltipHeader}>
              <Icon name="analytics-outline" size={24} color="#6366F1" />
              <Text style={styles.infoTooltipTitle}>Detailed View</Text>
            </View>

            <View style={styles.infoTooltipSection}>
              <View style={styles.infoTooltipIconRow}>
                <View style={[styles.infoTooltipIcon, { backgroundColor: '#EEF2FF' }]}>
                  <View style={styles.rangeBandPreview} />
                </View>
                <View style={styles.infoTooltipTextContent}>
                  <Text style={styles.infoTooltipSectionTitle}>Range Bands</Text>
                  <Text style={styles.infoTooltipSectionText}>
                    The shaded area shows your daily mood range from lowest to highest. A wider band means more mood variation that day.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoTooltipSection}>
              <View style={styles.infoTooltipIconRow}>
                <View style={[styles.infoTooltipIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Icon name="warning" size={16} color="#F59E0B" />
                </View>
                <View style={styles.infoTooltipTextContent}>
                  <Text style={styles.infoTooltipSectionTitle}>Variance Flags</Text>
                  <Text style={styles.infoTooltipSectionText}>
                    Yellow warning icons appear on days with significant mood swings (2+ levels). Tap them to see details.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoTooltipSection}>
              <View style={styles.infoTooltipIconRow}>
                <View style={[styles.infoTooltipIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Icon name="list-outline" size={16} color="#8B5CF6" />
                </View>
                <View style={styles.infoTooltipTextContent}>
                  <Text style={styles.infoTooltipSectionTitle}>All Entries</Text>
                  <Text style={styles.infoTooltipSectionText}>
                    Toggle "All Entries" to see individual check-ins instead of daily summaries.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.infoTooltipClose}
              onPress={() => setShowDetailedInfoTooltip(false)}
            >
              <Text style={styles.infoTooltipCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeframeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  timeframeTextActive: {
    color: colors.white,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryIconContainer: {
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summarySubtext: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggleLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 6,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  chartHint: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  subToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  subToggleHint: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  chartContainer: {
    position: 'relative',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#6B7280',
  },
  emotionLegendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
    gap: 12,
  },
  emotionLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodBreakdownContainer: {
    gap: 12,
  },
  moodBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodBreakdownHeader: {
    width: 80,
  },
  moodBreakdownLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
  },
  moodBreakdownCount: {
    fontSize: 10,
    color: '#6B7280',
  },
  moodBreakdownBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  moodBreakdownBar: {
    height: '100%',
    borderRadius: 4,
  },
  moodBreakdownPercent: {
    width: 36,
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'right',
  },
  recentMoodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentMoodEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentMoodEmojiText: {
    fontSize: 20,
  },
  recentMoodContent: {
    flex: 1,
    marginLeft: 12,
  },
  recentMoodLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  recentMoodDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  recentMoodIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moodOption: {
    alignItems: 'center',
  },
  moodOptionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodOptionEmoji: {
    fontSize: 28,
  },
  moodOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalLoader: {
    marginTop: 16,
  },
  // Day Details Modal Styles
  dayDetailsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  dayDetailsHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dayDetailsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  dayDetailsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  dayDetailsList: {
    maxHeight: 300,
  },
  dayDetailsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayDetailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayDetailsEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDetailsEmojiText: {
    fontSize: 22,
  },
  dayDetailsInfo: {
    marginLeft: 12,
    flex: 1,
  },
  dayDetailsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayDetailsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  sourceTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sourceTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dayDetailsTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  dayDetailsStress: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  dayDetailsMoodValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dayDetailsClose: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  dayDetailsCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Info tooltip styles
  viewToggleWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconButton: {
    padding: 4,
    marginRight: 2,
  },
  infoTooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoTooltipContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  infoTooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoTooltipTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 10,
  },
  infoTooltipSection: {
    marginBottom: 16,
  },
  infoTooltipIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTooltipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rangeBandPreview: {
    width: 20,
    height: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 3,
  },
  infoTooltipTextContent: {
    flex: 1,
  },
  infoTooltipSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  infoTooltipSectionText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  infoTooltipClose: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  infoTooltipCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MoodScreen;
