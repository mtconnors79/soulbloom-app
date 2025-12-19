import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { progressAPI } from '../../services/api';
import { colors } from '../../theme/colors';

// Badge icon mapping
const BADGE_ICONS = {
  star: 'star',
  calendar: 'calendar',
  fire: 'flame',
  trophy: 'trophy',
  leaf: 'leaf',
  spa: 'flower',
  wind: 'cloudy',
  'chart-line': 'trending-up',
  pencil: 'pencil',
};

const ProgressScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayProgress, setTodayProgress] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [challenges, setChallenges] = useState(null);
  const [newBadge, setNewBadge] = useState(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  const fetchData = async () => {
    try {
      const [todayRes, streaksRes, achievementsRes, challengesRes] = await Promise.all([
        progressAPI.getToday(),
        progressAPI.getStreaks(),
        progressAPI.getAchievements(),
        progressAPI.getChallenges(),
      ]);

      setTodayProgress(todayRes.data);
      setStreaks(streaksRes.data);
      setAchievements(achievementsRes.data);
      setChallenges(challengesRes.data?.challenges || []);
    } catch (error) {
      console.error('Error fetching progress data:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkForNewAchievements = async () => {
    try {
      const response = await progressAPI.checkAchievements();
      if (response.data?.newly_unlocked?.length > 0) {
        setNewBadge(response.data.newly_unlocked[0]);
        setShowCongrats(true);
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }).start();
        // Refresh achievements list
        const achievementsRes = await progressAPI.getAchievements();
        setAchievements(achievementsRes.data);
      }
    } catch (error) {
      console.error('Error checking achievements:', error.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      checkForNewAchievements();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    checkForNewAchievements();
  };

  const closeCongrats = () => {
    setShowCongrats(false);
    scaleAnim.setValue(0);
    setNewBadge(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  const GoalRing = ({ completed, label, icon }) => (
    <View style={styles.goalRing}>
      <View style={[styles.ringOuter, completed && styles.ringCompleted]}>
        <View style={[styles.ringInner, completed && styles.ringInnerCompleted]}>
          <Icon
            name={completed ? 'checkmark' : icon}
            size={24}
            color={completed ? '#10B981' : '#9CA3AF'}
          />
        </View>
      </View>
      <Text style={[styles.goalLabel, completed && styles.goalLabelCompleted]}>
        {label}
      </Text>
    </View>
  );

  const StreakCounter = ({ count, label, icon }) => (
    <View style={styles.streakItem}>
      <View style={styles.streakIconContainer}>
        <Icon name={icon} size={20} color={count > 0 ? '#F59E0B' : '#9CA3AF'} />
      </View>
      <Text style={[styles.streakCount, count > 0 && styles.streakCountActive]}>
        {count}
      </Text>
      <Text style={styles.streakLabel}>{label}</Text>
    </View>
  );

  const BadgeItem = ({ badge }) => (
    <View style={[styles.badgeItem, !badge.unlocked && styles.badgeLocked]}>
      <View style={[styles.badgeIcon, badge.unlocked && styles.badgeIconUnlocked]}>
        <Icon
          name={BADGE_ICONS[badge.icon] || 'medal'}
          size={28}
          color={badge.unlocked ? '#6366F1' : '#D1D5DB'}
        />
      </View>
      <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>
        {badge.name}
      </Text>
      {badge.unlocked && (
        <Icon name="checkmark-circle" size={16} color="#10B981" style={styles.badgeCheck} />
      )}
    </View>
  );

  const ChallengeItem = ({ challenge }) => (
    <View style={styles.challengeItem}>
      <View style={styles.challengeHeader}>
        <Text style={styles.challengeName}>{challenge.name}</Text>
        {challenge.completed && (
          <Icon name="checkmark-circle" size={20} color="#10B981" />
        )}
      </View>
      <Text style={styles.challengeDescription}>{challenge.description}</Text>
      <View style={styles.challengeProgressContainer}>
        <View style={styles.challengeProgressBar}>
          <View
            style={[
              styles.challengeProgressFill,
              { width: `${challenge.percentage}%` },
              challenge.completed && styles.challengeProgressComplete,
            ]}
          />
        </View>
        <Text style={styles.challengeProgressText}>
          {challenge.progress}/{challenge.target}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Goals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Goals</Text>
          <Text style={styles.sectionSubtitle}>
            {todayProgress?.completed_count || 0} of {todayProgress?.total_goals || 3} completed
          </Text>
          <View style={styles.goalsContainer}>
            <GoalRing
              completed={todayProgress?.has_checkin}
              label="Check-In"
              icon="create-outline"
            />
            <GoalRing
              completed={todayProgress?.has_mindfulness}
              label="Mindfulness"
              icon="leaf-outline"
            />
            <GoalRing
              completed={todayProgress?.has_quick_mood}
              label="Mood Log"
              icon="happy-outline"
            />
          </View>
          {todayProgress?.completed_count === todayProgress?.total_goals && (
            <View style={styles.allCompleteMessage}>
              <Icon name="sparkles" size={20} color="#10B981" />
              <Text style={styles.allCompleteText}>
                Great job! You've completed all today's goals
              </Text>
            </View>
          )}
        </View>

        {/* Current Streaks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Streaks</Text>
          <Text style={styles.sectionSubtitle}>Keep up the momentum</Text>
          <View style={styles.streaksContainer}>
            <StreakCounter
              count={streaks?.checkin_streak || 0}
              label="Check-In"
              icon="flame"
            />
            <StreakCounter
              count={streaks?.mindfulness_streak || 0}
              label="Mindful"
              icon="flame"
            />
            <StreakCounter
              count={streaks?.quick_mood_streak || 0}
              label="Mood"
              icon="flame"
            />
            <StreakCounter
              count={streaks?.overall_streak || 0}
              label="Overall"
              icon="trophy"
            />
          </View>
        </View>

        {/* Challenges Section */}
        {challenges && challenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Challenges</Text>
            <Text style={styles.sectionSubtitle}>
              Complete challenges to stay motivated
            </Text>
            {challenges.map((challenge) => (
              <ChallengeItem key={challenge.id} challenge={challenge} />
            ))}
          </View>
        )}

        {/* Achievements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <Text style={styles.sectionSubtitle}>
            {achievements?.unlocked_count || 0} of {achievements?.total_count || 0} unlocked
          </Text>
          <View style={styles.badgesGrid}>
            {achievements?.badges?.map((badge) => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Congratulations Modal */}
      <Modal
        visible={showCongrats}
        transparent
        animationType="fade"
        onRequestClose={closeCongrats}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.congratsModal,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.congratsIconContainer}>
              <Icon
                name={BADGE_ICONS[newBadge?.icon] || 'medal'}
                size={48}
                color="#6366F1"
              />
            </View>
            <Text style={styles.congratsTitle}>Achievement Unlocked!</Text>
            <Text style={styles.congratsBadgeName}>{newBadge?.name}</Text>
            <Text style={styles.congratsDescription}>
              {newBadge?.description}
            </Text>
            <TouchableOpacity
              style={styles.congratsButton}
              onPress={closeCongrats}
            >
              <Text style={styles.congratsButtonText}>Awesome!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  goalsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  goalRing: {
    alignItems: 'center',
  },
  ringOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCompleted: {
    borderColor: '#10B981',
  },
  ringInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInnerCompleted: {
    backgroundColor: '#ECFDF5',
  },
  goalLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  goalLabelCompleted: {
    color: colors.success,
  },
  allCompleteMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
  },
  allCompleteText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  streaksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  streakItem: {
    alignItems: 'center',
  },
  streakIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  streakCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  streakCountActive: {
    color: '#F59E0B',
  },
  streakLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  challengeItem: {
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  challengeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  challengeProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: 12,
  },
  challengeProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  challengeProgressComplete: {
    backgroundColor: colors.success,
  },
  challengeProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  badgeItem: {
    width: '33.33%',
    padding: 8,
    alignItems: 'center',
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIconUnlocked: {
    backgroundColor: colors.accent,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: colors.textSecondary,
  },
  badgeCheck: {
    position: 'absolute',
    top: 8,
    right: 12,
  },
  bottomPadding: {
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  congratsModal: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  congratsIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  congratsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  congratsBadgeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  congratsDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  congratsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  congratsButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ProgressScreen;
