/**
 * MindWell - Mental Health & Wellness App
 * https://github.com/mtconnors79/mindwell-app
 *
 * @format
 */

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox, ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import firebase from '@react-native-firebase/app';
import AppNavigator from './src/navigation/AppNavigator';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

function App(): React.JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Ensure Firebase is initialized
        if (firebase.apps.length > 0) {
          // Configure Google Sign-In after Firebase is ready
          GoogleSignin.configure({
            webClientId: '1000603870908-vhc03968kr7glq65505vfs85c717gtvc.apps.googleusercontent.com',
          });
        }
      } catch (error) {
        console.warn('Error configuring Google Sign-In:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
