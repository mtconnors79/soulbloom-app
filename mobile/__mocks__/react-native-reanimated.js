const { View, Text, Image, ScrollView, FlatList } = require('react-native');

module.exports = {
  __esModule: true,
  default: {
    call: jest.fn(),
    createAnimatedComponent: (component) => component,
    View: View,
    Text: Text,
    Image: Image,
    ScrollView: ScrollView,
    FlatList: FlatList,
  },
  useSharedValue: jest.fn(() => ({ value: 0 })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((value) => value),
  withSpring: jest.fn((value) => value),
  withDelay: jest.fn((_, value) => value),
  withSequence: jest.fn((...values) => values[0]),
  withRepeat: jest.fn((value) => value),
  interpolate: jest.fn(),
  Extrapolate: { CLAMP: 'clamp' },
  runOnJS: jest.fn((fn) => fn),
  runOnUI: jest.fn((fn) => fn),
  useAnimatedGestureHandler: jest.fn(() => ({})),
  createAnimatedComponent: (component) => component,
  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
    bezier: jest.fn(() => jest.fn()),
  },
};
