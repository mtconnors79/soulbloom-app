/**
 * SoulBloom - Mental Health & Wellness App
 * https://github.com/mtconnors79/soulbloom-app
 *
 * @format
 */

import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, LogBox, ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import firebase from '@react-native-firebase/app';
import Config from 'react-native-config';
import AppNavigator from './src/navigation/AppNavigator';
import pushNotificationService from './src/services/pushNotificationService';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Register background message handler (must be outside component)
pushNotificationService.setBackgroundHandler();

function App(): React.JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle notification tap navigation
  const handleNotificationTap = useCallback((remoteMessage: any) => {
    console.log('[App] Notification tapped:', remoteMessage);
    // TODO: Navigate based on notification data
    // e.g., if (remoteMessage.data?.type === 'goal') navigate to Progress screen
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Ensure Firebase is initialized
        if (firebase.apps.length > 0) {
          // Configure Google Sign-In after Firebase is ready
          GoogleSignin.configure({
            webClientId: Config.WEB_CLIENT_ID,
          });

          // Initialize push notifications
          await pushNotificationService.initialize();
        }
      } catch (error) {
        console.warn('Error during app initialization:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Set up notification handlers after initialization
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    // Handle foreground messages
    const unsubscribeForeground = pushNotificationService.onForegroundMessage((message) => {
      console.log('[App] Foreground message received:', message);
    });

    // Handle notification taps
    const unsubscribeTap = pushNotificationService.onNotificationTap(handleNotificationTap);

    // Handle token refresh
    const unsubscribeTokenRefresh = pushNotificationService.onTokenRefresh((token) => {
      console.log('[App] FCM token refreshed:', token);
    });

    return () => {
      unsubscribeForeground();
      unsubscribeTap();
      unsubscribeTokenRefresh();
    };
  }, [isInitialized, handleNotificationTap]);

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
