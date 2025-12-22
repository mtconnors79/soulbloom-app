/**
 * Jest Setup for React Native Testing
 *
 * Mocks for native modules and common dependencies
 */

import 'react-native-gesture-handler/jestSetup';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock @react-native-firebase/app
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: () => ({
    app: jest.fn(),
  }),
}));

// Mock @react-native-firebase/auth
jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
  },
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const MockSvg = ({ children, ...props }) => React.createElement('Svg', props, children);
  const MockPath = (props) => React.createElement('Path', props);
  const MockDefs = ({ children, ...props }) => React.createElement('Defs', props, children);
  const MockLinearGradient = ({ children, ...props }) => React.createElement('LinearGradient', props, children);
  const MockStop = (props) => React.createElement('Stop', props);
  const MockCircle = (props) => React.createElement('Circle', props);
  const MockRect = (props) => React.createElement('Rect', props);

  return {
    __esModule: true,
    default: MockSvg,
    Svg: MockSvg,
    Path: MockPath,
    Defs: MockDefs,
    LinearGradient: MockLinearGradient,
    Stop: MockStop,
    Circle: MockCircle,
    Rect: MockRect,
  };
});

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock react-native-sms
jest.mock('react-native-sms', () => ({
  send: jest.fn((options, callback) => callback(true, false, null)),
}));

// Mock @notifee/react-native
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    displayNotification: jest.fn(),
    createChannel: jest.fn(),
    cancelAllNotifications: jest.fn(),
    cancelNotification: jest.fn(),
  },
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
  },
  RepeatFrequency: {
    DAILY: 1,
  },
  TriggerType: {
    TIMESTAMP: 0,
  },
}));

// Mock Alert
jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

// Silence console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('Animated: `useNativeDriver`')) return;
  if (args[0]?.includes?.('componentWillReceiveProps')) return;
  originalWarn.apply(console, args);
};

// Mock timers for animation testing
jest.useFakeTimers();
