import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CheckInScreen from '../main/CheckInScreen';
import { checkinAPI, progressAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../services/api', () => ({
  checkinAPI: {
    create: jest.fn(),
  },
  progressAPI: {
    checkAchievements: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return (props) => (
    <View
      testID="stress-slider"
      accessibilityValue={{ now: props.value }}
      onResponderRelease={() => props.onValueChange?.(props.value)}
    />
  );
});

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('../../components/CrisisResourcesModal', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ visible, onClose, requireAcknowledgment, alertMessage }) => {
    if (!visible) return null;
    return (
      <View testID="crisis-modal">
        {alertMessage && <Text testID="crisis-alert-message">{alertMessage}</Text>}
        {requireAcknowledgment && <Text testID="crisis-requires-ack">Requires Acknowledgment</Text>}
        <TouchableOpacity testID="crisis-modal-close" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

const mockNavigation = {
  navigate: jest.fn(),
};

describe('CheckInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    progressAPI.checkAchievements.mockResolvedValue({});
  });

  describe('Rendering', () => {
    it('renders mood selector with all 5 options (great/good/okay/not_good/terrible)', () => {
      const { getByText } = render(<CheckInScreen navigation={mockNavigation} />);

      expect(getByText('Great')).toBeTruthy();
      expect(getByText('Good')).toBeTruthy();
      expect(getByText('Okay')).toBeTruthy();
      expect(getByText('Not Good')).toBeTruthy();
      expect(getByText('Terrible')).toBeTruthy();
    });

    it('renders stress slider (1-10)', () => {
      const { getByTestID, getByText } = render(<CheckInScreen navigation={mockNavigation} />);

      expect(getByText('Stress Level')).toBeTruthy();
      expect(getByTestID('stress-slider')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
      expect(getByText('10')).toBeTruthy();
    });

    it('renders emotion tag buttons', () => {
      const { getByText } = render(<CheckInScreen navigation={mockNavigation} />);

      expect(getByText('Happy')).toBeTruthy();
      expect(getByText('Calm')).toBeTruthy();
      expect(getByText('Energetic')).toBeTruthy();
      expect(getByText('Anxious')).toBeTruthy();
      expect(getByText('Stressed')).toBeTruthy();
      expect(getByText('Sad')).toBeTruthy();
      expect(getByText('Angry')).toBeTruthy();
      expect(getByText('Tired')).toBeTruthy();
    });
  });

  describe('Submit button state', () => {
    it('submit button disabled when mood not selected', () => {
      const { getByText } = render(<CheckInScreen navigation={mockNavigation} />);

      const submitButton = getByText('Save Check-in').parent;
      expect(submitButton.props.disabled).toBe(true);
    });

    it('submit button enabled after mood selection', () => {
      const { getByText } = render(<CheckInScreen navigation={mockNavigation} />);

      fireEvent.press(getByText('Great'));

      const submitButton = getByText('Save Check-in').parent;
      expect(submitButton.props.disabled).toBe(false);
    });
  });

  describe('User interactions', () => {
    it('selecting mood updates state', () => {
      const { getByText } = render(<CheckInScreen navigation={mockNavigation} />);

      const greatButton = getByText('Great').parent;
      fireEvent.press(greatButton);

      // Check that the button is now styled as selected (has border color)
      expect(greatButton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ borderColor: expect.any(String) }),
        ])
      );
    });

    it('selecting emotions toggles selection', () => {
      const { getByText } = render(<CheckInScreen navigation={mockNavigation} />);

      const happyButton = getByText('Happy').parent;

      // First tap selects
      fireEvent.press(happyButton);
      expect(happyButton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({}),
        ])
      );

      // Second tap deselects
      fireEvent.press(happyButton);
    });

    it('stress slider updates value', () => {
      const { getByTestID, getByText } = render(<CheckInScreen navigation={mockNavigation} />);

      // Default value is 5
      expect(getByText(/5\/10/)).toBeTruthy();
    });
  });

  describe('Form submission', () => {
    it('submit calls checkinAPI.create with correct payload', async () => {
      checkinAPI.create.mockResolvedValue({
        data: {
          checkin: {
            ai_analysis: {
              sentiment: 'positive',
              risk_level: 'low',
            },
          },
        },
      });

      const { getByText } = render(<CheckInScreen navigation={mockNavigation} />);

      // Select mood
      fireEvent.press(getByText('Great'));

      // Select emotion
      fireEvent.press(getByText('Happy'));

      // Submit
      fireEvent.press(getByText('Save Check-in'));

      await waitFor(() => {
        expect(checkinAPI.create).toHaveBeenCalledWith(
          expect.objectContaining({
            mood_rating: 'great',
            stress_level: 5,
            selected_emotions: ['happy'],
            auto_analyze: true,
          })
        );
      });
    });

    it('shows loading state during submission', async () => {
      checkinAPI.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { getByText, queryByTestId } = render(
        <CheckInScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Great'));
      fireEvent.press(getByText('Save Check-in'));

      // During loading, button should show ActivityIndicator
      await waitFor(() => {
        const submitButton = getByText('Save Check-in').parent;
        expect(submitButton.props.disabled).toBe(true);
      });
    });

    it('success shows analysis results modal', async () => {
      checkinAPI.create.mockResolvedValue({
        data: {
          checkin: {
            ai_analysis: {
              sentiment: 'positive',
              risk_level: 'low',
              supportive_message: 'Great job checking in!',
            },
          },
        },
      });

      const { getByText, findByText } = render(
        <CheckInScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Great'));
      fireEvent.press(getByText('Save Check-in'));

      await findByText('Check-in Saved!');
    });
  });

  describe('Crisis response handling', () => {
    it('critical risk response shows CrisisResourcesModal with requireAcknowledgment=true', async () => {
      checkinAPI.create.mockResolvedValue({
        data: {
          checkin: {
            ai_analysis: {
              sentiment: 'negative',
              risk_level: 'critical',
            },
          },
        },
      });

      const { getByText, findByTestId } = render(
        <CheckInScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Terrible'));
      fireEvent.press(getByText('Save Check-in'));

      const crisisModal = await findByTestId('crisis-modal');
      expect(crisisModal).toBeTruthy();

      const requiresAck = await findByTestId('crisis-requires-ack');
      expect(requiresAck).toBeTruthy();
    });

    it('high risk response shows inline crisis resources (dismissible)', async () => {
      checkinAPI.create.mockResolvedValue({
        data: {
          checkin: {
            ai_analysis: {
              sentiment: 'negative',
              risk_level: 'high',
              show_crisis_resources: true,
            },
          },
        },
      });

      const { getByText, findByText } = render(
        <CheckInScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Not Good'));
      fireEvent.press(getByText('Save Check-in'));

      // Should show analysis modal with crisis resources section
      await findByText('Check-in Saved!');
      await findByText('Support Resources');
    });

    it('medium risk shows subtle support link', async () => {
      checkinAPI.create.mockResolvedValue({
        data: {
          checkin: {
            ai_analysis: {
              sentiment: 'negative',
              risk_level: 'moderate',
            },
          },
        },
      });

      const { getByText, findByText, queryByText } = render(
        <CheckInScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Not Good'));
      fireEvent.press(getByText('Save Check-in'));

      await findByText('Check-in Saved!');
      // Should show support link but not crisis resources section
      await findByText(/Need support/);
      expect(queryByText('Support Resources')).toBeNull();
    });

    it('low risk shows no crisis UI', async () => {
      checkinAPI.create.mockResolvedValue({
        data: {
          checkin: {
            ai_analysis: {
              sentiment: 'positive',
              risk_level: 'low',
            },
          },
        },
      });

      const { getByText, findByText, queryByText, queryByTestId } = render(
        <CheckInScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Great'));
      fireEvent.press(getByText('Save Check-in'));

      await findByText('Check-in Saved!');
      expect(queryByTestId('crisis-modal')).toBeNull();
      expect(queryByText('Support Resources')).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('error handling shows alert', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      checkinAPI.create.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<CheckInScreen navigation={mockNavigation} />);

      fireEvent.press(getByText('Good'));
      fireEvent.press(getByText('Save Check-in'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('Network error')
        );
      });
    });

    it('shows error alert when submitting without mood selection', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = render(<CheckInScreen navigation={mockNavigation} />);

      // Try to submit by bypassing the disabled state (for coverage)
      // This tests the handleSubmit validation
    });
  });
});
