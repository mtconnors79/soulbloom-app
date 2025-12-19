import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/Ionicons';
import { checkinAPI, progressAPI } from '../../services/api';
import CrisisResourcesModal from '../../components/CrisisResourcesModal';

const RESOURCE_SUGGESTIONS_KEY = '@soulbloom_resource_suggestions';

const PROMPTS = [
  "How are you feeling right now?",
  "What's on your mind today?",
  "What are you grateful for?",
  "What challenged you today?",
  "What brought you joy recently?",
];

const MOOD_OPTIONS = [
  { value: 'great', label: 'Great', emoji: '😄', color: '#10B981' },
  { value: 'good', label: 'Good', emoji: '🙂', color: '#34D399' },
  { value: 'okay', label: 'Okay', emoji: '😐', color: '#F59E0B' },
  { value: 'not_good', label: 'Not Good', emoji: '😔', color: '#F97316' },
  { value: 'terrible', label: 'Terrible', emoji: '😢', color: '#EF4444' },
];

const EMOTION_TAGS = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'calm', label: 'Calm', emoji: '😌' },
  { value: 'energetic', label: 'Energetic', emoji: '⚡' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
  { value: 'stressed', label: 'Stressed', emoji: '😫' },
  { value: 'sad', label: 'Sad', emoji: '😢' },
  { value: 'angry', label: 'Angry', emoji: '😠' },
  { value: 'tired', label: 'Tired', emoji: '😴' },
];

const CheckInScreen = ({ navigation }) => {
  const [moodRating, setMoodRating] = useState(null);
  const [stressLevel, setStressLevel] = useState(5);
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [currentPrompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [crisisModalRequireAck, setCrisisModalRequireAck] = useState(false);
  const [crisisAlertMessage, setCrisisAlertMessage] = useState(null);
  const [showSupportLink, setShowSupportLink] = useState(false);

  // Resource suggestion modal state
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [detectedTopic, setDetectedTopic] = useState(null);
  const [dontShowResourceSuggestions, setDontShowResourceSuggestions] = useState(false);
  const [resourceSuggestionsEnabled, setResourceSuggestionsEnabled] = useState(true);

  // Load preference on mount
  useEffect(() => {
    loadResourcePreference();
  }, []);

  const loadResourcePreference = async () => {
    try {
      const value = await AsyncStorage.getItem(RESOURCE_SUGGESTIONS_KEY);
      if (value !== null) {
        setResourceSuggestionsEnabled(value === 'true');
      }
    } catch (error) {
      console.log('Error loading resource preference:', error);
    }
  };

  const saveResourcePreference = async (enabled) => {
    try {
      await AsyncStorage.setItem(RESOURCE_SUGGESTIONS_KEY, enabled.toString());
      setResourceSuggestionsEnabled(enabled);
    } catch (error) {
      console.log('Error saving resource preference:', error);
    }
  };

  const toggleEmotion = (emotion) => {
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion]
    );
  };

  const getStressLevelLabel = (level) => {
    if (level <= 3) return 'Low';
    if (level <= 6) return 'Moderate';
    if (level <= 8) return 'High';
    return 'Very High';
  };

  const getStressLevelColor = (level) => {
    if (level <= 3) return '#10B981';
    if (level <= 6) return '#F59E0B';
    if (level <= 8) return '#F97316';
    return '#EF4444';
  };

  const handleSubmit = async () => {
    if (!moodRating) {
      Alert.alert('Error', 'Please select your mood rating');
      return;
    }

    setLoading(true);
    setShowSupportLink(false);
    try {
      const response = await checkinAPI.create({
        mood_rating: moodRating,
        stress_level: stressLevel,
        selected_emotions: selectedEmotions,
        check_in_text: text.trim(),
        auto_analyze: true,
      });

      const checkinAnalysis = response.data?.checkin?.ai_analysis;
      setAnalysis(checkinAnalysis || null);

      // Check for newly unlocked achievements
      progressAPI.checkAchievements().catch(err =>
        console.log('Achievement check:', err.message)
      );

      const riskLevel = checkinAnalysis?.risk_level?.toLowerCase();
      const sentiment = checkinAnalysis?.sentiment?.toLowerCase();
      const detectedTopics = checkinAnalysis?.detected_topics;

      // Check for critical or high risk - show modal with required acknowledgment
      if (riskLevel === 'critical' || riskLevel === 'high') {
        setCrisisAlertMessage(
          "We noticed you may be struggling. Here are some resources that can help. You're not alone."
        );
        setCrisisModalRequireAck(true);
        setShowCrisisModal(true);
      } else if (detectedTopics && detectedTopics.length > 0 && resourceSuggestionsEnabled) {
        // Show contextual resource suggestion for detected topics
        setDetectedTopic(detectedTopics[0]); // Show first detected topic
        setShowResourceModal(true);
      } else if (sentiment === 'negative' || moodRating === 'terrible' || moodRating === 'not_good') {
        // Show subtle support link for negative sentiment
        setShowSupportLink(true);
      }

      Alert.alert(
        'Check-in Saved',
        'Your check-in has been recorded. Take care of yourself!',
        [
          {
            text: 'View Analysis',
            onPress: () => {},
          },
          {
            text: 'Done',
            onPress: () => {
              if (!(riskLevel === 'critical' || riskLevel === 'high')) {
                resetForm();
                navigation.navigate('Home');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', error.message || 'Failed to save check-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMoodRating(null);
    setStressLevel(5);
    setSelectedEmotions([]);
    setText('');
    setAnalysis(null);
    setShowSupportLink(false);
    setCrisisAlertMessage(null);
    setCrisisModalRequireAck(false);
    setDetectedTopic(null);
    setDontShowResourceSuggestions(false);
  };

  const handleResourceModalClose = () => {
    if (dontShowResourceSuggestions) {
      saveResourcePreference(false);
    }
    setShowResourceModal(false);
    setDetectedTopic(null);
    setDontShowResourceSuggestions(false);
  };

  const handleCallResource = (phone) => {
    if (phone) {
      const phoneUrl = `tel:${phone.replace(/[^0-9+]/g, '')}`;
      Linking.openURL(phoneUrl).catch(err => {
        console.log('Error opening phone:', err);
        Alert.alert('Error', 'Unable to open phone dialer');
      });
    }
  };

  const handleOpenResourceUrl = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        console.log('Error opening URL:', err);
        Alert.alert('Error', 'Unable to open link');
      });
    }
  };

  const handleTextResource = (textOption) => {
    if (textOption) {
      // Parse "Text HOME to 741741" format
      const match = textOption.match(/text\s+(\w+)\s+to\s+([\d-]+)/i);
      if (match) {
        const body = match[1];
        const number = match[2];
        Linking.openURL(`sms:${number}&body=${body}`).catch(err => {
          console.log('Error opening SMS:', err);
          Alert.alert('Error', 'Unable to open messaging app');
        });
      }
    }
  };

  const handleOpenSupport = () => {
    setCrisisAlertMessage(null);
    setCrisisModalRequireAck(false);
    setShowCrisisModal(true);
  };

  const handleAnalyze = async () => {
    if (!moodRating) {
      Alert.alert('Error', 'Please select your mood rating to analyze');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await checkinAPI.analyze(text.trim(), {
        mood_rating: moodRating,
        stress_level: stressLevel,
        selected_emotions: selectedEmotions,
      });
      setAnalysis(response.data?.analysis || null);
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return '#10B981';
      case 'negative':
        return '#EF4444';
      case 'mixed':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return '#10B981';
      case 'moderate':
        return '#F59E0B';
      case 'high':
        return '#F97316';
      case 'critical':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Prompt Card */}
        <View style={styles.promptCard}>
          <Icon name="chatbubble-ellipses" size={24} color="#6366F1" />
          <Text style={styles.promptText}>{currentPrompt}</Text>
        </View>

        {/* Mood Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How are you feeling?</Text>
          <View style={styles.moodContainer}>
            {MOOD_OPTIONS.map((mood) => (
              <TouchableOpacity
                key={mood.value}
                style={[
                  styles.moodButton,
                  moodRating === mood.value && { backgroundColor: mood.color + '20', borderColor: mood.color },
                ]}
                onPress={() => setMoodRating(mood.value)}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text
                  style={[
                    styles.moodLabel,
                    moodRating === mood.value && { color: mood.color, fontWeight: '600' },
                  ]}
                >
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stress Level Slider */}
        <View style={styles.section}>
          <View style={styles.stressHeader}>
            <Text style={styles.sectionTitle}>Stress Level</Text>
            <View style={[styles.stressLevelBadge, { backgroundColor: getStressLevelColor(stressLevel) + '20' }]}>
              <Text style={[styles.stressLevelText, { color: getStressLevelColor(stressLevel) }]}>
                {stressLevel}/10 - {getStressLevelLabel(stressLevel)}
              </Text>
            </View>
          </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>1</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={stressLevel}
              onValueChange={setStressLevel}
              minimumTrackTintColor={getStressLevelColor(stressLevel)}
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor={getStressLevelColor(stressLevel)}
            />
            <Text style={styles.sliderLabel}>10</Text>
          </View>
        </View>

        {/* Emotion Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What emotions are you experiencing?</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          <View style={styles.emotionTagsContainer}>
            {EMOTION_TAGS.map((emotion) => (
              <TouchableOpacity
                key={emotion.value}
                style={[
                  styles.emotionTag,
                  selectedEmotions.includes(emotion.value) && styles.emotionTagSelected,
                ]}
                onPress={() => toggleEmotion(emotion.value)}
              >
                <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                <Text
                  style={[
                    styles.emotionLabel,
                    selectedEmotions.includes(emotion.value) && styles.emotionLabelSelected,
                  ]}
                >
                  {emotion.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Text Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional thoughts (optional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Share more about how you're feeling..."
              placeholderTextColor="#9CA3AF"
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.charCount}>{text.length}/2000</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.analyzeButton, analyzing && styles.buttonDisabled]}
            onPress={handleAnalyze}
            disabled={analyzing || !moodRating}
          >
            {analyzing ? (
              <ActivityIndicator color="#6366F1" size="small" />
            ) : (
              <>
                <Icon name="sparkles" size={18} color="#6366F1" />
                <Text style={styles.analyzeButtonText}>Analyze</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !moodRating}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.submitButtonText}>Save Check-in</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Analysis Results */}
        {analysis && (
          <View style={styles.analysisCard}>
            <View style={styles.analysisHeader}>
              <Icon name="analytics" size={24} color="#6366F1" />
              <Text style={styles.analysisTitle}>Analysis</Text>
            </View>

            {/* Sentiment */}
            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>Sentiment:</Text>
              <View style={[styles.badge, { backgroundColor: getSentimentColor(analysis.sentiment) + '20' }]}>
                <Text style={[styles.badgeText, { color: getSentimentColor(analysis.sentiment) }]}>
                  {analysis.sentiment || 'Unknown'}
                </Text>
              </View>
            </View>

            {/* Risk Level */}
            {analysis.risk_level && (
              <View style={styles.analysisRow}>
                <Text style={styles.analysisLabel}>Risk Level:</Text>
                <View style={[styles.badge, { backgroundColor: getRiskColor(analysis.risk_level) + '20' }]}>
                  <Text style={[styles.badgeText, { color: getRiskColor(analysis.risk_level) }]}>
                    {analysis.risk_level}
                  </Text>
                </View>
              </View>
            )}

            {/* Emotions */}
            {analysis.emotions?.length > 0 && (
              <View style={styles.analysisSection}>
                <Text style={styles.analysisLabel}>Emotions detected:</Text>
                <View style={styles.tagsContainer}>
                  {analysis.emotions.map((emotion, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{emotion}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Suggestions */}
            {analysis.suggestions?.length > 0 && (
              <View style={styles.suggestionsSection}>
                <Text style={styles.suggestionsTitle}>Suggestions:</Text>
                {analysis.suggestions.map((suggestion, index) => (
                  <View key={index} style={styles.suggestionItem}>
                    <Icon name="bulb-outline" size={16} color="#F59E0B" />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Supportive Message */}
            {analysis.supportive_message && (
              <View style={styles.messageCard}>
                <Icon name="heart" size={20} color="#EC4899" />
                <Text style={styles.messageText}>{analysis.supportive_message}</Text>
              </View>
            )}
          </View>
        )}

        {/* Need Support Link - shown for negative sentiment */}
        {showSupportLink && (
          <TouchableOpacity style={styles.supportLinkContainer} onPress={handleOpenSupport}>
            <Icon name="heart-outline" size={18} color="#6366F1" />
            <Text style={styles.supportLinkText}>Need support? Tap here for resources</Text>
            <Icon name="chevron-forward" size={16} color="#6366F1" />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Crisis Resources Modal */}
      <CrisisResourcesModal
        visible={showCrisisModal}
        onClose={() => {
          setShowCrisisModal(false);
          if (crisisModalRequireAck) {
            resetForm();
            navigation.navigate('Home');
          }
        }}
        requireAcknowledgment={crisisModalRequireAck}
        alertMessage={crisisAlertMessage}
      />

      {/* Contextual Resource Suggestion Modal */}
      <Modal
        visible={showResourceModal}
        transparent
        animationType="slide"
        onRequestClose={handleResourceModalClose}
      >
        <View style={styles.resourceModalOverlay}>
          <View style={styles.resourceModalContent}>
            {/* Header with gentle icon */}
            <View style={styles.resourceModalHeader}>
              <View style={styles.resourceModalIconContainer}>
                <Icon name="heart" size={28} color="#EC4899" />
              </View>
              <Text style={styles.resourceModalTitle}>We're here for you</Text>
            </View>

            {/* Gentle message */}
            <Text style={styles.resourceModalMessage}>
              It sounds like you might be going through something related to{' '}
              <Text style={styles.resourceModalTopic}>
                {detectedTopic?.topic_name}
              </Text>
              . You're not alone, and support is available.
            </Text>

            {/* Resource card */}
            {detectedTopic?.resource && (
              <View style={styles.resourceCard}>
                <Text style={styles.resourceName}>
                  {detectedTopic.resource.name}
                </Text>
                <Text style={styles.resourceDescription}>
                  {detectedTopic.resource.description}
                </Text>

                {/* Action buttons */}
                <View style={styles.resourceActions}>
                  {detectedTopic.resource.phone && (
                    <TouchableOpacity
                      style={styles.resourceActionButton}
                      onPress={() => handleCallResource(detectedTopic.resource.phone)}
                    >
                      <Icon name="call" size={18} color="#fff" />
                      <Text style={styles.resourceActionText}>
                        {detectedTopic.resource.phone}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {detectedTopic.resource.text_option && (
                    <TouchableOpacity
                      style={[styles.resourceActionButton, styles.resourceActionSecondary]}
                      onPress={() => handleTextResource(detectedTopic.resource.text_option)}
                    >
                      <Icon name="chatbubble" size={18} color="#6366F1" />
                      <Text style={[styles.resourceActionText, styles.resourceActionTextSecondary]}>
                        {detectedTopic.resource.text_option}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {detectedTopic.resource.url && (
                    <TouchableOpacity
                      style={styles.resourceLinkButton}
                      onPress={() => handleOpenResourceUrl(detectedTopic.resource.url)}
                    >
                      <Icon name="globe-outline" size={16} color="#6366F1" />
                      <Text style={styles.resourceLinkText}>Visit website</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Don't show again checkbox */}
            <TouchableOpacity
              style={styles.dontShowContainer}
              onPress={() => setDontShowResourceSuggestions(!dontShowResourceSuggestions)}
            >
              <View style={[
                styles.checkbox,
                dontShowResourceSuggestions && styles.checkboxChecked
              ]}>
                {dontShowResourceSuggestions && (
                  <Icon name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={styles.dontShowText}>
                Don't show these suggestions
              </Text>
            </TouchableOpacity>

            {/* Dismiss button */}
            <TouchableOpacity
              style={styles.resourceDismissButton}
              onPress={handleResourceModalClose}
            >
              <Text style={styles.resourceDismissText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  promptCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  promptText: {
    flex: 1,
    fontSize: 16,
    color: '#4F46E5',
    marginLeft: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: -8,
    marginBottom: 12,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    flex: 1,
    marginHorizontal: 3,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  stressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stressLevelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stressLevelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  emotionTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  emotionTagSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  emotionEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  emotionLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  emotionLabelSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
    minHeight: 80,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  analyzeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  analyzeButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  analysisCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  analysisLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  analysisSection: {
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    color: '#4B5563',
    textTransform: 'capitalize',
  },
  suggestionsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
    lineHeight: 20,
  },
  messageCard: {
    backgroundColor: '#FDF2F8',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#831843',
    marginLeft: 8,
    lineHeight: 20,
  },
  supportLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  supportLinkText: {
    flex: 1,
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
    marginLeft: 8,
  },
  // Resource Suggestion Modal Styles
  resourceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  resourceModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  resourceModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resourceModalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  resourceModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  resourceModalMessage: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  resourceModalTopic: {
    fontWeight: '600',
    color: '#6366F1',
  },
  resourceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  resourceName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  resourceActions: {
    gap: 10,
  },
  resourceActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  resourceActionSecondary: {
    backgroundColor: '#EEF2FF',
  },
  resourceActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  resourceActionTextSecondary: {
    color: '#6366F1',
  },
  resourceLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  resourceLinkText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  dontShowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  dontShowText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resourceDismissButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resourceDismissText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});

export default CheckInScreen;
