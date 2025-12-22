import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { goalsAPI } from '../../services/goalsApi';
import { colors } from '../../theme/colors';

// Activity type icons
const ACTIVITY_ICONS = {
  check_in: 'create-outline',
  quick_mood: 'happy-outline',
  mindfulness: 'leaf-outline',
  breathing: 'cloudy-outline',
  journaling: 'book-outline',
};

// Activity type labels
const ACTIVITY_LABELS = {
  check_in: 'Check-in',
  quick_mood: 'Quick Mood',
  mindfulness: 'Mindfulness',
  breathing: 'Breathing',
  journaling: 'Journaling',
};

// Time frame labels
const TIME_FRAME_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const GoalHistoryScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goals, setGoals] = useState([]);

  const fetchHistory = async () => {
    try {
      const response = await goalsAPI.getHistory();
      setGoals(response.data?.goals || []);
    } catch (error) {
      console.error('Error fetching goal history:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Goal History',
      'Are you sure you want to delete all past goals? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await goalsAPI.clearHistory();
              setGoals([]);
              Alert.alert('Success', 'Goal history cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusInfo = (goal) => {
    if (goal.completed_at) {
      return {
        label: 'Completed',
        color: colors.success,
        bgColor: '#ECFDF5',
        icon: 'checkmark-circle',
      };
    }
    return {
      label: 'Expired',
      color: colors.warning,
      bgColor: '#FEF3C7',
      icon: 'time-outline',
    };
  };

  const renderGoalItem = ({ item }) => {
    const statusInfo = getStatusInfo(item);

    return (
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={styles.goalIconContainer}>
            <Icon
              name={ACTIVITY_ICONS[item.activity_type] || 'flag-outline'}
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>{item.title}</Text>
            <Text style={styles.goalMeta}>
              {ACTIVITY_LABELS[item.activity_type]} • {TIME_FRAME_LABELS[item.time_frame]}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Icon name={statusInfo.icon} size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.goalDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Target:</Text>
            <Text style={styles.detailValue}>
              {item.target_count} {item.target_count === 1 ? 'time' : 'times'} per {item.time_frame.replace('ly', '')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>{formatDate(item.created_at)}</Text>
          </View>
          {item.completed_at ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed:</Text>
              <Text style={styles.detailValue}>{formatDate(item.completed_at)}</Text>
            </View>
          ) : (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ended:</Text>
              <Text style={styles.detailValue}>{formatDate(item.updated_at)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="time-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Past Goals</Text>
      <Text style={styles.emptyText}>
        Completed and expired goals will appear here
      </Text>
    </View>
  );

  const renderHeader = () => {
    if (goals.length === 0) return null;

    const completedCount = goals.filter(g => g.completed_at).length;
    const expiredCount = goals.length - completedCount;

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryCount}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryCount}>{expiredCount}</Text>
          <Text style={styles.summaryLabel}>Expired</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryCount}>{goals.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (goals.length === 0) return null;

    return (
      <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
        <Icon name="trash-outline" size={20} color="#EF4444" />
        <Text style={styles.clearButtonText}>Clear History</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={renderGoalItem}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.divider,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goalMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default GoalHistoryScreen;
