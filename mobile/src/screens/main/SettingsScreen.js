import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AddReminderModal from '../../components/AddReminderModal';
import {
  requestNotificationPermission,
  checkNotificationPermission,
  loadDailyReminder,
  saveDailyReminder,
  scheduleDailyReminder,
  cancelDailyReminder,
  loadReminders,
  saveReminders,
  scheduleNotification,
  cancelNotification,
  generateReminderId,
} from '../../services/notificationService';

const RESOURCE_SUGGESTIONS_KEY = '@soulbloom_resource_suggestions';

const SettingsScreen = ({ navigation }) => {
  // Daily Reminder State
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState(new Date());
  const [showDailyTimePicker, setShowDailyTimePicker] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Custom Reminders State
  const [reminders, setReminders] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);

  // Preferences State
  const [resourceSuggestionsEnabled, setResourceSuggestionsEnabled] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Check notification permission
    const permitted = await checkNotificationPermission();
    setHasPermission(permitted);

    // Load daily reminder settings
    const dailySettings = await loadDailyReminder();
    setDailyReminderEnabled(dailySettings.enabled);

    const [hours, minutes] = dailySettings.time.split(':').map(Number);
    const time = new Date();
    time.setHours(hours, minutes, 0, 0);
    setDailyReminderTime(time);

    // Load custom reminders
    const savedReminders = await loadReminders();
    setReminders(savedReminders);

    // Load resource suggestions preference
    try {
      const resourcePref = await AsyncStorage.getItem(RESOURCE_SUGGESTIONS_KEY);
      if (resourcePref !== null) {
        setResourceSuggestionsEnabled(resourcePref === 'true');
      }
    } catch (error) {
      console.log('Error loading resource preference:', error);
    }
  };

  const handleResourceSuggestionsToggle = async (value) => {
    setResourceSuggestionsEnabled(value);
    try {
      await AsyncStorage.setItem(RESOURCE_SUGGESTIONS_KEY, value.toString());
    } catch (error) {
      console.log('Error saving resource preference:', error);
    }
  };

  const handleDailyReminderToggle = async (value) => {
    if (value && !hasPermission) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in Settings to receive reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
      setHasPermission(true);
    }

    setDailyReminderEnabled(value);

    const timeStr = formatTimeForStorage(dailyReminderTime);
    await saveDailyReminder({ enabled: value, time: timeStr });

    if (value) {
      await scheduleDailyReminder(timeStr);
    } else {
      await cancelDailyReminder();
    }
  };

  const handleDailyTimeChange = async (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowDailyTimePicker(false);
    }

    if (selectedTime) {
      setDailyReminderTime(selectedTime);

      const timeStr = formatTimeForStorage(selectedTime);
      await saveDailyReminder({ enabled: dailyReminderEnabled, time: timeStr });

      if (dailyReminderEnabled) {
        await cancelDailyReminder();
        await scheduleDailyReminder(timeStr);
      }
    }
  };

  const formatTimeForStorage = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatTimeDisplay = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleAddReminder = () => {
    if (!hasPermission) {
      requestNotificationPermission().then((granted) => {
        if (granted) {
          setHasPermission(true);
          setEditingReminder(null);
          setShowAddModal(true);
        } else {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in Settings to add reminders.',
            [{ text: 'OK' }]
          );
        }
      });
      return;
    }
    setEditingReminder(null);
    setShowAddModal(true);
  };

  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    setShowAddModal(true);
  };

  const handleSaveReminder = async (reminderData) => {
    let updatedReminders;

    if (reminderData.id) {
      // Editing existing reminder
      updatedReminders = reminders.map((r) =>
        r.id === reminderData.id ? reminderData : r
      );
      await cancelNotification(reminderData.id);
    } else {
      // Adding new reminder
      reminderData.id = generateReminderId();
      updatedReminders = [...reminders, reminderData];
    }

    setReminders(updatedReminders);
    await saveReminders(updatedReminders);

    if (reminderData.enabled) {
      await scheduleNotification(reminderData);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await cancelNotification(reminderId);
            const updatedReminders = reminders.filter((r) => r.id !== reminderId);
            setReminders(updatedReminders);
            await saveReminders(updatedReminders);
          },
        },
      ]
    );
  };

  const handleToggleReminder = async (reminder) => {
    const updatedReminder = { ...reminder, enabled: !reminder.enabled };
    const updatedReminders = reminders.map((r) =>
      r.id === reminder.id ? updatedReminder : r
    );

    setReminders(updatedReminders);
    await saveReminders(updatedReminders);

    if (updatedReminder.enabled) {
      await scheduleNotification(updatedReminder);
    } else {
      await cancelNotification(reminder.id);
    }
  };

  const getFrequencyLabel = (frequency, days) => {
    switch (frequency) {
      case 'daily':
        return 'Every day';
      case 'weekdays':
        return 'Weekdays';
      case 'weekends':
        return 'Weekends';
      case 'custom':
        if (days && days.length > 0) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return days.map((d) => dayNames[d]).join(', ');
        }
        return 'Custom';
      default:
        return frequency;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'checkin':
        return 'create-outline';
      case 'mindfulness':
        return 'leaf-outline';
      default:
        return 'heart-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          {/* Daily Reminder */}
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Icon name="notifications-outline" size={22} color="#6366F1" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Daily Reminder</Text>
                  <Text style={styles.settingDescription}>
                    Get reminded to check in each day
                  </Text>
                </View>
              </View>
              <Switch
                value={dailyReminderEnabled}
                onValueChange={handleDailyReminderToggle}
                trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                thumbColor={dailyReminderEnabled ? '#6366F1' : '#9CA3AF'}
              />
            </View>

            {dailyReminderEnabled && (
              <TouchableOpacity
                style={styles.timeSelector}
                onPress={() => setShowDailyTimePicker(true)}
              >
                <Icon name="time-outline" size={20} color="#6366F1" />
                <Text style={styles.timeText}>{formatTimeDisplay(dailyReminderTime)}</Text>
                <Icon name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            {showDailyTimePicker && (
              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={dailyReminderTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDailyTimeChange}
                  style={styles.timePicker}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => setShowDailyTimePicker(false)}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Custom Reminders */}
          <View style={styles.settingCard}>
            <View style={styles.customRemindersHeader}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Icon name="alarm-outline" size={22} color="#6366F1" />
                </View>
                <Text style={styles.settingLabel}>Custom Reminders</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddReminder}
              >
                <Icon name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {reminders.length === 0 ? (
              <Text style={styles.emptyText}>
                No custom reminders yet. Tap + to add one.
              </Text>
            ) : (
              <View style={styles.remindersList}>
                {reminders.map((reminder) => (
                  <View key={reminder.id} style={styles.reminderItem}>
                    <TouchableOpacity
                      style={styles.reminderContent}
                      onPress={() => handleEditReminder(reminder)}
                    >
                      <View style={styles.reminderIcon}>
                        <Icon
                          name={getTypeIcon(reminder.type)}
                          size={20}
                          color={reminder.enabled ? '#6366F1' : '#9CA3AF'}
                        />
                      </View>
                      <View style={styles.reminderInfo}>
                        <Text style={[
                          styles.reminderTime,
                          !reminder.enabled && styles.reminderDisabled,
                        ]}>
                          {reminder.time}
                        </Text>
                        <Text style={styles.reminderFrequency}>
                          {getFrequencyLabel(reminder.frequency, reminder.days)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.reminderActions}>
                      <Switch
                        value={reminder.enabled}
                        onValueChange={() => handleToggleReminder(reminder)}
                        trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                        thumbColor={reminder.enabled ? '#6366F1' : '#9CA3AF'}
                        style={styles.reminderSwitch}
                      />
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteReminder(reminder.id)}
                      >
                        <Icon name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: '#FDF2F8' }]}>
                  <Icon name="heart-outline" size={22} color="#EC4899" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Resource Suggestions</Text>
                  <Text style={styles.settingDescription}>
                    Show helpful resources based on check-in content
                  </Text>
                </View>
              </View>
              <Switch
                value={resourceSuggestionsEnabled}
                onValueChange={handleResourceSuggestionsToggle}
                trackColor={{ false: '#E5E7EB', true: '#FBCFE8' }}
                thumbColor={resourceSuggestionsEnabled ? '#EC4899' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Display Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display</Text>
          <View style={styles.settingCard}>
            <View style={styles.placeholderContent}>
              <Icon name="color-palette-outline" size={32} color="#9CA3AF" />
              <Text style={styles.placeholderText}>Coming soon</Text>
              <Text style={styles.placeholderSubtext}>
                Theme and display options will be available in a future update
              </Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingCard}>
            <View style={styles.aboutContent}>
              <View style={styles.appIcon}>
                <Icon name="heart" size={32} color="#6366F1" />
              </View>
              <Text style={styles.appName}>SoulBloom</Text>
              <Text style={styles.appTagline}>Grow gently, live fully</Text>
              <Text style={styles.appVersion}>Version 0.5.0</Text>
              <Text style={styles.madeWith}>Made with ❤️</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <AddReminderModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingReminder(null);
        }}
        onSave={handleSaveReminder}
        editingReminder={editingReminder}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  timeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  timePickerContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  timePicker: {
    width: '100%',
    height: 150,
  },
  doneButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  customRemindersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  remindersList: {
    gap: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  reminderDisabled: {
    color: '#9CA3AF',
  },
  reminderFrequency: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
  placeholderContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
  },
  placeholderSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  aboutContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  appTagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6366F1',
    marginTop: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  madeWith: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  bottomPadding: {
    height: 32,
  },
});

export default SettingsScreen;
