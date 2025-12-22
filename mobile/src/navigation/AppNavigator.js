import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';

// Components
import RateLimitModal from '../components/RateLimitModal';

// API rate limit handlers
import { setRateLimitHandler, clearRateLimitHandler } from '../services/api';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Screens
import HomeScreen from '../screens/main/HomeScreen';
import CheckInScreen from '../screens/main/CheckInScreen';
import MoodScreen from '../screens/main/MoodScreen';
import MindfulnessScreen from '../screens/main/MindfulnessScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import EmergencyContactsScreen from '../screens/main/EmergencyContactsScreen';
import CareCircleScreen from '../screens/main/CareCircleScreen';

const Stack = createStackNavigator();
const MainStack = createStackNavigator();
const Tab = createBottomTabNavigator();

const HomeTabIcon = ({ focused, color, size }) => (
  <Icon name={focused ? 'home' : 'home-outline'} size={size} color={color} />
);

const CheckInTabIcon = ({ focused, color, size }) => (
  <Icon name={focused ? 'create' : 'create-outline'} size={size} color={color} />
);

const MoodTabIcon = ({ focused, color, size }) => (
  <Icon name={focused ? 'analytics' : 'analytics-outline'} size={size} color={color} />
);

const MindfulnessTabIcon = ({ focused, color, size }) => (
  <Icon name={focused ? 'leaf' : 'leaf-outline'} size={size} color={color} />
);

const ProgressTabIcon = ({ focused, color, size }) => (
  <Icon name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />
);

const ProfileTabIcon = ({ focused, color, size }) => (
  <Icon name={focused ? 'person' : 'person-outline'} size={size} color={color} />
);

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#6366F1',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'SoulBloom',
          tabBarIcon: HomeTabIcon,
        }}
      />
      <Tab.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{
          title: 'Daily Check-In',
          tabBarIcon: CheckInTabIcon,
        }}
      />
      <Tab.Screen
        name="Mood"
        component={MoodScreen}
        options={{
          title: 'My Journey',
          tabBarIcon: MoodTabIcon,
        }}
      />
      <Tab.Screen
        name="Mindfulness"
        component={MindfulnessScreen}
        options={{
          title: 'Mindfulness',
          tabBarIcon: MindfulnessTabIcon,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          title: 'Progress',
          tabBarIcon: ProgressTabIcon,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ProfileTabIcon,
        }}
      />
    </Tab.Navigator>
  );
};

const MainStackNavigator = () => {
  return (
    <MainStack.Navigator>
      <MainStack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerStyle: {
            backgroundColor: '#6366F1',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <MainStack.Screen
        name="EmergencyContacts"
        component={EmergencyContactsScreen}
        options={{
          title: 'Emergency Contacts',
          headerStyle: {
            backgroundColor: '#6366F1',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <MainStack.Screen
        name="CareCircle"
        component={CareCircleScreen}
        options={{
          title: 'Care Circle',
          headerStyle: {
            backgroundColor: '#355F5B',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </MainStack.Navigator>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6366F1',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Welcome to SoulBloom' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Create Account' }}
      />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [rateLimitData, setRateLimitData] = useState(null);

  // Handle rate limit modal close
  const handleRateLimitClose = useCallback(() => {
    try {
      setRateLimitData(null);
    } catch (error) {
      console.error('[AppNavigator] Error closing rate limit modal:', error);
    }
  }, []);

  // Set up rate limit handler
  useEffect(() => {
    try {
      setRateLimitHandler((data) => {
        // Defensive checks for data validity
        if (!data || typeof data !== 'object') {
          console.warn('[AppNavigator] Invalid rate limit data received');
          return;
        }

        // Validate and sanitize the data
        const sanitizedData = {
          isDistressed: typeof data.isDistressed === 'boolean' ? data.isDistressed : false,
          retryAfter: typeof data.retryAfter === 'number' && data.retryAfter > 0
            ? data.retryAfter
            : 60,
          crisisResources: Array.isArray(data.crisisResources) ? data.crisisResources : [],
          message: typeof data.message === 'string' ? data.message : '',
        };

        setRateLimitData(sanitizedData);
      });
    } catch (error) {
      console.error('[AppNavigator] Error setting rate limit handler:', error);
    }

    return () => {
      try {
        clearRateLimitHandler();
      } catch (error) {
        console.error('[AppNavigator] Error clearing rate limit handler:', error);
      }
    };
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      if (initializing) {
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return null; // Or a loading screen
  }

  return (
    <>
      <NavigationContainer>
        {user ? <MainStackNavigator /> : <AuthStack />}
      </NavigationContainer>

      {/* Rate Limit Modal - rendered outside NavigationContainer */}
      <RateLimitModal
        visible={rateLimitData !== null}
        isDistressed={rateLimitData?.isDistressed || false}
        retryAfter={rateLimitData?.retryAfter || 60}
        crisisResources={rateLimitData?.crisisResources || []}
        onClose={handleRateLimitClose}
      />
    </>
  );
};

export default AppNavigator;
