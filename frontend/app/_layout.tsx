import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AuthProvider } from '../src/lib/auth';

// Impedisce alla splash screen di chiudersi automaticamente prima che l'app sia pronta
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore */
});

// Register widget task handler (Android only, no-op on other platforms)
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { widgetTaskHandler } = require('../src/widgets/widgetTaskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // library not available in current environment
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    console.log('[RootLayout] Startup sequence started');
    if (fontsLoaded || fontError) {
      console.log('[RootLayout] Fonts ready, hiding splash screen');
      SplashScreen.hideAsync().catch(() => {
        /* ignore */
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
