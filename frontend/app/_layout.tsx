import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { AuthProvider } from '../src/lib/auth';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Preveniamo l'auto-hide dello splash screen per gestire il caricamento manuale
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

// Register widget task handler (Android only, no-op on other platforms)
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { widgetTaskHandler } = require('../src/widgets/widgetTaskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (error) {
    console.warn('Native widget registration failed (expected if config is missing):', error);
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        /* ignore errors */
      });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#09090b' }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#09090b' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
