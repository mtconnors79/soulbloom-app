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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import { moodAPI, checkinAPI } from '../../services/api';

const QUICK_MOOD_OPTIONS = [
  { emoji: '😄', label: 'great', score: 1.0, color: '#10B981' },
  { emoji: '😊', label: 'good', score: 0.5, color: '#34D399' },
  { emoji: '😐', label: 'okay', score: 0.0, color: '#F59E0B' },
  { emoji: '😟', label: 'not great', score: -0.5, color: '#F97316' },
  { emoji: '😢', label: 'difficult', score: -1.0, color: '#EF4444' },
];

const QuickActionButton = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
    <Icon name={icon} size={28} color="#fff" />
    <Text style={styles.actionButtonText}>{label}</Text>
  </TouchableOpacity>
);

const HomeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [moodStats, setMoodStats] = useState(null);
  const [recentCheckin, setRecentCheckin] = useState(null);
  const [quickMoodLoading, setQuickMoodLoading] = useState(false);
  const user = auth().currentUser;

  const fetchData = useCallback(async () => {
    try {
      const [moodResponse, checkinResponse] = await Promise.all([
        moodAPI.stats({ days: 7 }).catch(() => ({ data: { stats: null } })),
        checkinAPI.list({ limit: 1 }).catch(() => ({ data: { checkins: [] } })),
      ]);

      setMoodStats(moodResponse.data?.stats || null);
      setRecentCheckin(checkinResponse.data?.checkins?.[0] || null);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleQuickMood = async (moodOption) => {
    setQuickMoodLoading(true);
    try {
      await moodAPI.create({
        sentiment_score: moodOption.score,
        sentiment_label: moodOption.label,
        check_in_date: new Date().toISOString().split('T')[0],
      });
      Alert.alert('Mood Logged', `You're feeling ${moodOption.label} today.`);
      fetchData();
    } catch (error) {
      console.error('Quick mood log error:', error);
      Alert.alert('Error', 'Failed to log mood. Please try again.');
    } finally {
      setQuickMoodLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getMoodEmoji = (score) => {
    if (score >= 0.6) return { emoji: '😊', label: 'Great', color: '#10B981' };
    if (score >= 0.2) return { emoji: '🙂', label: 'Good', color: '#6366F1' };
    if (score >= -0.2) return { emoji: '😐', label: 'Okay', color: '#F59E0B' };
    if (score >= -0.6) return { emoji: '😔', label: 'Low', color: '#F97316' };
    return { emoji: '😢', label: 'Difficult', color: '#EF4444' };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
      }
    >
      {/* Greeting Section */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.userName}>{user?.displayName || 'Friend'}</Text>
      </View>

      {/* Quick Mood Card */}
      <View style={styles.quickMoodCard}>
        <Text style={styles.quickMoodTitle}>How are you feeling?</Text>
        <View style={styles.quickMoodRow}>
          {QUICK_MOOD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.label}
              style={styles.quickMoodButton}
              onPress={() => handleQuickMood(option)}
              disabled={quickMoodLoading}
            >
              <Text style={styles.quickMoodEmoji}>{option.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {quickMoodLoading && (
          <ActivityIndicator size="small" color="#6366F1" style={styles.quickMoodLoader} />
        )}
      </View>

      {/* Mood Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="analytics" size={24} color="#6366F1" />
          <Text style={styles.cardTitle}>Your Week</Text>
        </View>
        {moodStats ? (
          <View style={styles.moodSummary}>
            <View style={styles.moodScoreContainer}>
              <Text style={styles.moodEmoji}>
                {getMoodEmoji(moodStats.averageScore || 0).emoji}
              </Text>
              <Text style={[styles.moodLabel, { color: getMoodEmoji(moodStats.averageScore || 0).color }]}>
                {getMoodEmoji(moodStats.averageScore || 0).label}
              </Text>
            </View>
            <View style={styles.moodDetails}>
              <Text style={styles.moodDetailText}>
                {moodStats.totalEntries || 0} mood entries this week
              </Text>
              <Text style={styles.moodTrend}>
                Trend: {moodStats.trend || 'stable'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyMood}>
            <Text style={styles.emptyText}>No mood data yet</Text>
            <Text style={styles.emptySubtext}>Start tracking to see your trends</Text>
          </View>
        )}
      </View>

      {/* Recent Check-in Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="create" size={24} color="#6366F1" />
          <Text style={styles.cardTitle}>Latest Check-in</Text>
        </View>
        {recentCheckin ? (
          <View style={styles.checkinContent}>
            <Text style={styles.checkinDate}>{formatDate(recentCheckin.created_at)}</Text>
            <Text style={styles.checkinText} numberOfLines={3}>
              {recentCheckin.check_in_text}
            </Text>
            {recentCheckin.ai_analysis?.sentiment && (
              <View style={styles.sentimentBadge}>
                <Text style={styles.sentimentText}>
                  Feeling: {recentCheckin.ai_analysis.sentiment}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyCheckin}>
            <Text style={styles.emptyText}>No check-ins yet</Text>
            <Text style={styles.emptySubtext}>Share how you're feeling</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <QuickActionButton
          icon="create-outline"
          label="Daily Check-In"
          color="#6366F1"
          onPress={() => navigation.navigate('CheckIn')}
        />
        <QuickActionButton
          icon="analytics-outline"
          label="My Journey"
          color="#10B981"
          onPress={() => navigation.navigate('Mood')}
        />
        <QuickActionButton
          icon="fitness-outline"
          label="Activity"
          color="#F59E0B"
          onPress={() => {}}
        />
        <QuickActionButton
          icon="call-outline"
          label="Contacts"
          color="#EF4444"
          onPress={() => {}}
        />
      </View>

      {/* Motivational Quote */}
      <View style={styles.quoteCard}>
        <Icon name="sparkles" size={20} color="#6366F1" />
        <Text style={styles.quoteText}>
          "Every day is a new opportunity to take care of your mental health."
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  greetingSection: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  quickMoodCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickMoodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  quickMoodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  quickMoodButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickMoodEmoji: {
    fontSize: 28,
  },
  quickMoodLoader: {
    marginTop: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  moodSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodScoreContainer: {
    alignItems: 'center',
    marginRight: 20,
  },
  moodEmoji: {
    fontSize: 48,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  moodDetails: {
    flex: 1,
  },
  moodDetailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  moodTrend: {
    fontSize: 14,
    color: '#6366F1',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  emptyMood: {
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  checkinContent: {
    paddingTop: 4,
  },
  checkinDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  checkinText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  sentimentBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  sentimentText: {
    fontSize: 12,
    color: '#6366F1',
    textTransform: 'capitalize',
  },
  emptyCheckin: {
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  quoteCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  quoteText: {
    flex: 1,
    fontSize: 14,
    color: '#4F46E5',
    fontStyle: 'italic',
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default HomeScreen;
