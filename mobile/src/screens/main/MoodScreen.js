import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { moodAPI } from '../../services/api';

const MOOD_OPTIONS = [
  { value: 1.0, emoji: '😄', label: 'Amazing', color: '#10B981' },
  { value: 0.5, emoji: '🙂', label: 'Good', color: '#6366F1' },
  { value: 0.0, emoji: '😐', label: 'Okay', color: '#F59E0B' },
  { value: -0.5, emoji: '😔', label: 'Low', color: '#F97316' },
  { value: -1.0, emoji: '😢', label: 'Difficult', color: '#EF4444' },
];

const MoodScreen = () => {
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(null);

  const fetchMoods = useCallback(async () => {
    try {
      const [moodsResponse, statsResponse] = await Promise.all([
        moodAPI.list({ limit: 50 }),
        moodAPI.stats({ days: 30 }),
      ]);

      setMoods(moodsResponse.data?.moodEntries || []);
      setStats(statsResponse.data?.stats || null);
    } catch (error) {
      console.error('Error fetching moods:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMoods();
  }, [fetchMoods]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMoods();
  }, [fetchMoods]);

  const handleAddMood = async (moodOption) => {
    setSubmitting(true);
    try {
      await moodAPI.create({
        sentiment_score: moodOption.value,
        sentiment_label: moodOption.label.toLowerCase(),
        check_in_date: new Date().toISOString(),
      });

      setShowAddModal(false);
      fetchMoods();
      Alert.alert('Mood Logged', `You're feeling ${moodOption.label.toLowerCase()} today.`);
    } catch (error) {
      console.error('Error adding mood:', error);
      Alert.alert('Error', 'Failed to log mood. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMood = (id) => {
    Alert.alert(
      'Delete Mood Entry',
      'Are you sure you want to delete this mood entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await moodAPI.delete(id);
              fetchMoods();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete mood entry.');
            }
          },
        },
      ]
    );
  };

  const getMoodEmoji = (score) => {
    const mood = MOOD_OPTIONS.find(m => {
      const diff = Math.abs(m.value - score);
      return diff <= 0.25;
    }) || MOOD_OPTIONS[2];
    return mood;
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
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderMoodItem = ({ item }) => {
    const mood = getMoodEmoji(parseFloat(item.sentiment_score));

    return (
      <TouchableOpacity
        style={styles.moodItem}
        onLongPress={() => handleDeleteMood(item.id)}
      >
        <View style={[styles.moodEmojiContainer, { backgroundColor: mood.color + '20' }]}>
          <Text style={styles.moodEmoji}>{mood.emoji}</Text>
        </View>
        <View style={styles.moodContent}>
          <Text style={styles.moodLabel}>{item.sentiment_label}</Text>
          <Text style={styles.moodDate}>
            {formatDate(item.check_in_date)} • {formatTime(item.created_at)}
          </Text>
        </View>
        <View style={[styles.moodIndicator, { backgroundColor: mood.color }]} />
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Stats Card */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>30-Day Overview</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalEntries || 0}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {stats.averageScore ? (stats.averageScore > 0 ? '+' : '') + stats.averageScore.toFixed(1) : '0'}
              </Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#6366F1' }]}>
                {stats.trend || 'stable'}
              </Text>
              <Text style={styles.statLabel}>Trend</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Moods</Text>
        <Text style={styles.sectionSubtitle}>Long press to delete</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="happy-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No mood entries yet</Text>
      <Text style={styles.emptySubtitle}>Start tracking how you feel each day</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={moods}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMoodItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
      />

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 8,
  },
  statsCard: {
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
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  moodItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  moodEmojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodContent: {
    flex: 1,
    marginLeft: 12,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  moodDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  moodIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
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
});

export default MoodScreen;
