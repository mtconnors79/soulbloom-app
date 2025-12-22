import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../theme/colors';

const RateLimitModal = ({
  visible,
  isDistressed = false,
  retryAfter = 60,
  crisisResources = [],
  onClose,
}) => {
  const [countdown, setCountdown] = useState(retryAfter);

  useEffect(() => {
    if (visible) {
      setCountdown(retryAfter);
    }
  }, [visible, retryAfter]);

  useEffect(() => {
    if (!visible || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, countdown]);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }, []);

  const handleCall = useCallback((phone) => {
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handleText = useCallback((phone) => {
    const url = Platform.OS === 'ios' ? `sms:${phone}` : `sms:${phone}?body=HOME`;
    Linking.openURL(url);
  }, []);

  const defaultCrisisResources = [
    {
      id: 'suicide-lifeline',
      name: '988 Suicide & Crisis Lifeline',
      description: 'Free, confidential support 24/7',
      phone: '988',
      type: 'call',
    },
    {
      id: 'crisis-text',
      name: 'Crisis Text Line',
      description: 'Text HOME to 741741',
      phone: '741741',
      type: 'text',
    },
    {
      id: 'emergency',
      name: 'Emergency Services',
      description: 'For immediate emergencies',
      phone: '911',
      type: 'emergency',
    },
  ];

  const resources = crisisResources.length > 0 ? crisisResources : defaultCrisisResources;

  const renderDistressedContent = () => (
    <>
      <View style={styles.iconContainer}>
        <Icon name="heart" size={48} color={colors.primary} />
      </View>

      <Text style={styles.title}>We're Here for You</Text>

      <Text style={styles.distressMessage}>
        While we process your previous entries, here are resources available right now:
      </Text>

      <View style={styles.resourcesContainer}>
        {resources.map((resource) => (
          <TouchableOpacity
            key={resource.id}
            style={[
              styles.resourceCard,
              resource.type === 'emergency' && styles.emergencyCard,
            ]}
            onPress={() =>
              resource.type === 'text'
                ? handleText(resource.phone)
                : handleCall(resource.phone)
            }
          >
            <View style={styles.resourceInfo}>
              <Text
                style={[
                  styles.resourceName,
                  resource.type === 'emergency' && styles.emergencyText,
                ]}
              >
                {resource.name}
              </Text>
              <Text style={styles.resourceDescription}>{resource.description}</Text>
            </View>
            <View style={styles.resourceAction}>
              <Icon
                name={resource.type === 'text' ? 'chatbubble' : 'call'}
                size={24}
                color={resource.type === 'emergency' ? colors.error : colors.primary}
              />
              <Text
                style={[
                  styles.resourcePhone,
                  resource.type === 'emergency' && styles.emergencyText,
                ]}
              >
                {resource.type === 'text' ? 'Text' : 'Call'}: {resource.phone}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.countdownContainer}>
        <Text style={styles.countdownLabel}>Ready to continue in:</Text>
        <Text style={styles.countdownValue}>{formatTime(countdown)}</Text>
      </View>
    </>
  );

  const renderStandardContent = () => (
    <>
      <View style={styles.iconContainer}>
        <Icon name="time-outline" size={48} color={colors.primary} />
      </View>

      <Text style={styles.title}>Taking a Breather</Text>

      <Text style={styles.standardMessage}>
        You're using the app a lot — that's great! Give us a moment to catch up.
      </Text>

      <View style={styles.countdownContainerLarge}>
        <Text style={styles.countdownLabelLarge}>Ready in</Text>
        <View style={styles.countdownCircle}>
          <Text style={styles.countdownValueLarge}>{formatTime(countdown)}</Text>
        </View>
      </View>

      <Text style={styles.hint}>
        Taking a moment to breathe can be helpful too!
      </Text>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {countdown <= 0 && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {isDistressed ? renderDistressedContent() : renderStandardContent()}

          {countdown <= 0 && (
            <TouchableOpacity style={styles.continueButton} onPress={onClose}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  distressMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  standardMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  resourcesContainer: {
    width: '100%',
    marginBottom: 20,
  },
  resourceCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emergencyCard: {
    borderColor: colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  resourceInfo: {
    marginBottom: 8,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  emergencyText: {
    color: colors.error,
  },
  resourceDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  resourceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resourcePhone: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  countdownContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: '100%',
  },
  countdownLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  countdownValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  countdownContainerLarge: {
    alignItems: 'center',
    marginBottom: 20,
  },
  countdownLabelLarge: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  countdownCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownValueLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 20,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RateLimitModal;
