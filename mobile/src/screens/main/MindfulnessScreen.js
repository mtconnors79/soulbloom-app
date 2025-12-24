import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';
import { mindfulnessAPI, progressAPI } from '../../services/api';
import BreathingExerciseModal from '../../components/BreathingExerciseModal';
import { colors } from '../../theme/colors';

const CATEGORY_ICONS = {
  breathing: 'leaf',
  grounding: 'earth',
  quick_resets: 'flash',
  guided_meditations: 'headset',
  sleep: 'moon',
};

const CATEGORY_COLORS = {
  breathing: '#10B981',
  grounding: '#8B5CF6',
  quick_resets: '#F59E0B',
  guided_meditations: '#6366F1',
  sleep: '#3B82F6',
};

const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
};

const ActivityCard = ({ activity, onPress, categoryColor }) => (
  <TouchableOpacity style={styles.activityCard} onPress={() => onPress(activity)}>
    <View style={styles.activityCardContent}>
      <View style={styles.activityInfo}>
        <Text style={styles.activityName}>{activity.name}</Text>
        <Text style={styles.activityDescription} numberOfLines={2}>
          {activity.description}
        </Text>
        <View style={styles.activityMeta}>
          <View style={[styles.durationBadge, { backgroundColor: categoryColor + '20' }]}>
            <Icon name="time-outline" size={14} color={categoryColor} />
            <Text style={[styles.durationText, { color: categoryColor }]}>
              {formatDuration(activity.duration_seconds)}
            </Text>
          </View>
          {activity.type === 'external' && (
            <View style={styles.externalBadge}>
              <Icon name="open-outline" size={14} color="#6B7280" />
              <Text style={styles.externalText}>External</Text>
            </View>
          )}
        </View>
      </View>
      <Icon name="chevron-forward" size={24} color="#9CA3AF" />
    </View>
  </TouchableOpacity>
);

const CategorySection = ({ category, activities, onActivityPress }) => {
  const [expanded, setExpanded] = useState(true);
  const categoryColor = CATEGORY_COLORS[category.id] || '#6366F1';
  const categoryIcon = CATEGORY_ICONS[category.id] || 'fitness';

  return (
    <View style={styles.categorySection}>
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '20' }]}>
          <Icon name={categoryIcon} size={24} color={categoryColor} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color="#6B7280"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.activitiesList}>
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onPress={onActivityPress}
              categoryColor={categoryColor}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const MindfulnessScreen = () => {
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [activities, setActivities] = useState({});
  const [stats, setStats] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [completionLoading, setCompletionLoading] = useState(false);
  const hasAutoOpened = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const [activitiesResponse, statsResponse] = await Promise.all([
        mindfulnessAPI.getActivities(),
        mindfulnessAPI.getStats().catch(() => ({ data: { stats: null } })),
      ]);

      setCategories(activitiesResponse.data?.categories || []);
      setActivities(activitiesResponse.data?.activities || {});
      setStats(statsResponse.data?.stats || null);
    } catch (error) {
      console.error('Error fetching mindfulness data:', error);
      Alert.alert('Error', 'Failed to load mindfulness activities.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle auto-open from navigation params (e.g., from HomeScreen suggested activity)
  useEffect(() => {
    const { activityId, activityCategory, autoOpen } = route.params || {};

    // Only auto-open once per navigation, and only after activities are loaded
    if (autoOpen && activityId && !loading && Object.keys(activities).length > 0 && !hasAutoOpened.current) {
      hasAutoOpened.current = true;

      // Find the activity in our loaded activities
      let foundActivity = null;

      // Search in the specific category first if provided
      if (activityCategory && activities[activityCategory]) {
        foundActivity = activities[activityCategory].find(a => a.id === activityId);
      }

      // If not found, search all categories
      if (!foundActivity) {
        for (const categoryActivities of Object.values(activities)) {
          foundActivity = categoryActivities.find(a => a.id === activityId);
          if (foundActivity) break;
        }
      }

      if (foundActivity) {
        // Auto-open the activity (same logic as handleActivityPress)
        if (foundActivity.category === 'breathing' || foundActivity.instructions) {
          setSelectedActivity(foundActivity);
          setShowBreathingModal(true);
        } else if (foundActivity.steps) {
          // For grounding/other activities, show the steps alert
          // Note: Using simpler alert without completion callback to avoid dependency issues
          Alert.alert(
            foundActivity.name,
            foundActivity.steps.join('\n\n'),
            [{ text: 'Got it', style: 'default' }]
          );
        }
      }
    }
  }, [route.params, loading, activities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleActivityPress = async (activity) => {
    if (activity.type === 'external') {
      // Open external URL
      try {
        const supported = await Linking.canOpenURL(activity.url);
        if (supported) {
          await Linking.openURL(activity.url);
          // Log completion for external activities
          handleCompleteActivity(activity.id, true);
        } else {
          Alert.alert('Error', 'Cannot open this link.');
        }
      } catch (error) {
        console.error('Error opening URL:', error);
        Alert.alert('Error', 'Failed to open the link.');
      }
    } else if (activity.category === 'breathing' || activity.instructions) {
      // Show breathing exercise modal for breathing activities
      setSelectedActivity(activity);
      setShowBreathingModal(true);
    } else if (activity.steps) {
      // Show steps for grounding/other activities
      Alert.alert(
        activity.name,
        activity.steps.join('\n\n'),
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark Complete',
            onPress: () => handleCompleteActivity(activity.id),
          },
        ]
      );
    }
  };

  const handleCompleteActivity = async (activityId, isExternal = false) => {
    setCompletionLoading(true);
    try {
      const response = await mindfulnessAPI.completeActivity(activityId);
      const newStats = response.data?.stats;

      if (newStats) {
        setStats(newStats);
      }

      // Check for newly unlocked achievements
      progressAPI.checkAchievements().catch(err =>
        console.log('Achievement check:', err.message)
      );

      if (!isExternal) {
        Alert.alert(
          'Great Job!',
          newStats?.currentStreak > 1
            ? `Activity completed! You're on a ${newStats.currentStreak}-day streak!`
            : 'Activity completed! Keep up the great work!',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error completing activity:', error);
      if (!isExternal) {
        Alert.alert('Error', 'Failed to log activity completion.');
      }
    } finally {
      setCompletionLoading(false);
    }
  };

  const handleBreathingComplete = () => {
    if (selectedActivity) {
      handleCompleteActivity(selectedActivity.id);
    }
    setShowBreathingModal(false);
    setSelectedActivity(null);
  };

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
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
          />
        }
      >
        {/* Stats Card */}
        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalCompletions}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.streakContainer}>
                <Icon name="flame" size={20} color="#F59E0B" />
                <Text style={styles.statValue}>{stats.currentStreak}</Text>
              </View>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.weeklyCompletions}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        )}

        {/* Categories */}
        {categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            activities={activities[category.id] || []}
            onActivityPress={handleActivityPress}
          />
        ))}

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Breathing Exercise Modal */}
      <BreathingExerciseModal
        visible={showBreathingModal}
        onClose={() => {
          setShowBreathingModal(false);
          setSelectedActivity(null);
        }}
        onComplete={handleBreathingComplete}
        activity={selectedActivity}
      />

      {/* Loading overlay */}
      {completionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activitiesList: {
    marginTop: 8,
    marginLeft: 24,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  activityCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activityDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  externalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    gap: 4,
  },
  externalText: {
    fontSize: 12,
    color: '#6B7280',
  },
  bottomPadding: {
    height: 24,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MindfulnessScreen;
