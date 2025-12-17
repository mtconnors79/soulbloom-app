/**
 * MindWell - Mental Health & Wellness App
 * https://github.com/mtconnors79/mindwell-app
 *
 * @format
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AppNavigator from './src/navigation/AppNavigator';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '1000603870908-vhc03968kr7glq65505vfs85c717gtvc.apps.googleusercontent.com', // Get from Firebase Console
});

function App(): React.JSX.Element {
  useEffect(() => {
    // App initialization logic can go here
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
