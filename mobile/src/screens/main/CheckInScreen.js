import React, { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { checkinAPI } from '../../services/api';

const PROMPTS = [
  "How are you feeling right now?",
  "What's on your mind today?",
  "What are you grateful for?",
  "What challenged you today?",
  "What brought you joy recently?",
];

const CheckInScreen = ({ navigation }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [currentPrompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please write something about how you are feeling');
      return;
    }

    setLoading(true);
    try {
      const response = await checkinAPI.create({
        check_in_text: text.trim(),
        auto_analyze: true,
      });

      if (response.data?.alert?.type === 'crisis') {
        Alert.alert(
          'We\'re Here For You',
          response.data.alert.message + '\n\nCrisis Hotline: 988',
          [
            { text: 'I\'m Okay', style: 'cancel' },
            { text: 'Call 988', onPress: () => {} },
          ]
        );
      }

      setAnalysis(response.data?.checkin?.ai_analysis || null);

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
              setText('');
              setAnalysis(null);
              navigation.navigate('Home');
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

  const handleAnalyze = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please write something to analyze');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await checkinAPI.analyze(text.trim());
      setAnalysis(response.data?.analysis || null);
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze text. Please try again.');
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
      >
        {/* Prompt Card */}
        <View style={styles.promptCard}>
          <Icon name="chatbubble-ellipses" size={24} color="#6366F1" />
          <Text style={styles.promptText}>{currentPrompt}</Text>
        </View>

        {/* Text Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Share your thoughts..."
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.charCount}>{text.length}/2000</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.analyzeButton, analyzing && styles.buttonDisabled]}
            onPress={handleAnalyze}
            disabled={analyzing || !text.trim()}
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
            disabled={loading || !text.trim()}
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
      </ScrollView>
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
  },
  promptCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  promptText: {
    flex: 1,
    fontSize: 16,
    color: '#4F46E5',
    marginLeft: 12,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    minHeight: 200,
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
    minHeight: 160,
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
});

export default CheckInScreen;
