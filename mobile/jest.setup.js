/**
 * Jest Setup for React Native Testing
 *
 * Mocks for native modules and common dependencies
 * Note: react-native-reanimated and react-native-gesture-handler
 * are mocked via moduleNameMapper in jest.config.js pointing to __mocks__/
 */

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
jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    currentUser: {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
    },
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(() => Promise.resolve()),
    onAuthStateChanged: jest.fn((callback) => {
      // Immediately call with mock user
      callback({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      });
      // Return unsubscribe function
      return jest.fn();
    }),
    createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({
      user: { uid: 'new-user-uid', email: 'new@example.com' },
    })),
  });
});

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
    createTriggerNotification: jest.fn(),
    cancelAllNotifications: jest.fn(),
    cancelNotification: jest.fn(),
    requestPermission: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
    getNotificationSettings: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
  },
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
  },
  RepeatFrequency: {
    DAILY: 1,
    WEEKLY: 2,
  },
  TriggerType: {
    TIMESTAMP: 0,
  },
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: 0,
  },
}));

// Mock @react-native-community/datetimepicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props) => React.createElement(View, { testID: 'date-time-picker', ...props }),
  };
});

// Mock @react-native-community/slider
jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props) => React.createElement(View, { testID: 'slider', ...props }),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Mock react-native-chart-kit
jest.mock('react-native-chart-kit', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LineChart: (props) => React.createElement(View, { testID: 'line-chart', ...props }),
    BarChart: (props) => React.createElement(View, { testID: 'bar-chart', ...props }),
    PieChart: (props) => React.createElement(View, { testID: 'pie-chart', ...props }),
  };
});

// Mock @react-native-google-signin/google-signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ idToken: 'test-token' })),
    signOut: jest.fn(() => Promise.resolve()),
  },
}));

// Mock react-native-config
jest.mock('react-native-config', () => ({
  API_URL: 'http://localhost:3000',
  FIREBASE_API_KEY: 'test-key',
  FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
  FIREBASE_MESSAGING_SENDER_ID: '123456789',
  FIREBASE_APP_ID: '1:123456789:web:abc123',
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
