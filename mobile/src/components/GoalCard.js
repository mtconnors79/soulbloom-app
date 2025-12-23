import React, { useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';

const ACTIVITY_ICONS = {
  check_in: 'create-outline',
  quick_mood: 'happy-outline',
  mindfulness: 'leaf-outline',
  breathing: 'cloudy-outline',
  journaling: 'book-outline',
};

const TIME_FRAME_LABELS = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
};

const GoalCard = ({ goal, onEdit, onDelete, onComplete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const { progress, timeRemaining } = goal;
  const isCompleted = goal.completed_at !== null;
  const percentComplete = progress?.percentComplete || 0;
  const current = progress?.current || 0;
  const target = progress?.target || goal.target_count;

  // Check if expiring soon (< 1 day left and < 80% complete)
  const isExpiringSoon = !isCompleted &&
    timeRemaining?.hoursRemaining <= 24 &&
    percentComplete < 80;

  const handlePress = () => {
    if (isCompleted) return;

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleEdit = () => {
    setShowMenu(false);
    onEdit?.(goal);
  };

  const handleDelete = () => {
    setShowMenu(false);
    onDelete?.(goal);
  };

  const getTimeRemainingText = () => {
    if (!timeRemaining) return '';
    const { hoursRemaining, daysRemaining } = timeRemaining;

    if (daysRemaining > 1) {
      return `${daysRemaining} days left`;
    } else if (hoursRemaining > 1) {
      return `${hoursRemaining} hours left`;
    } else if (hoursRemaining === 1) {
      return '1 hour left';
    } else {
      return 'Ending soon';
    }
  };

  const getProgressText = () => {
    return `${current}/${target} ${TIME_FRAME_LABELS[goal.time_frame]}`;
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.card,
          isCompleted && styles.cardCompleted,
          isExpiringSoon && styles.cardWarning,
        ]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Left Icon */}
        <View style={[
          styles.iconContainer,
          isCompleted && styles.iconContainerCompleted,
          isExpiringSoon && styles.iconContainerWarning,
        ]}>
          {isCompleted ? (
            <Icon name="checkmark" size={24} color={colors.white} />
          ) : (
            <Icon
              name={ACTIVITY_ICONS[goal.activity_type] || 'flag-outline'}
              size={24}
              color={isExpiringSoon ? colors.warning : colors.primary}
            />
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[
              styles.title,
              isCompleted && styles.titleCompleted
            ]} numberOfLines={1}>
              {goal.title}
            </Text>
            {isExpiringSoon && !isCompleted && (
              <Icon name="warning" size={16} color={colors.warning} style={styles.warningIcon} />
            )}
          </View>

          {/* Progress Bar */}
          {!isCompleted && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(percentComplete, 100)}%` },
                    isExpiringSoon && styles.progressFillWarning,
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{getProgressText()}</Text>
            </View>
          )}

          {/* Time Remaining or Completed */}
          <Text style={[
            styles.timeText,
            isCompleted && styles.timeTextCompleted,
            isExpiringSoon && styles.timeTextWarning,
          ]}>
            {isCompleted ? 'Completed!' : getTimeRemainingText()}
          </Text>
        </View>

        {/* Menu Button */}
        {!isCompleted && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={handleMenuPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="ellipsis-vertical" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Celebration Badge for Completed */}
        {isCompleted && (
          <View style={styles.celebrationBadge}>
            <Icon name="trophy" size={16} color="#F59E0B" />
          </View>
        )}
      </TouchableOpacity>

      {/* Dropdown Menu */}
      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
            <Icon name="pencil-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.menuItemText}>Edit</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
            <Icon name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    position: 'relative',
  },
  card: {
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
  cardCompleted: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  cardWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerCompleted: {
    backgroundColor: '#10B981',
  },
  iconContainerWarning: {
    backgroundColor: '#FEF3C7',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  titleCompleted: {
    color: '#10B981',
  },
  warningIcon: {
    marginLeft: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressFillWarning: {
    backgroundColor: colors.warning,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 80,
    textAlign: 'right',
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  timeTextCompleted: {
    color: '#10B981',
    fontWeight: '600',
  },
  timeTextWarning: {
    color: colors.warning,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
    marginLeft: 4,
  },
  celebrationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDropdown: {
    position: 'absolute',
    top: 56,
    right: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    minWidth: 140,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  menuItemTextDanger: {
    color: colors.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 16,
  },
});

// Wrap with React.memo to prevent unnecessary re-renders
// Only re-renders when goal, onEdit, or onDelete props change
export default memo(GoalCard);
