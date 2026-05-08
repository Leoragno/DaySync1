import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/lib/auth';
import { theme } from '../src/lib/theme';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(10)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Ingresso animato
    Animated.parallel([
      Animated.timing(glowOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(glowScale, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(logoRotate, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    const t1 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(textY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 400);

    const t2 = setTimeout(() => {
      Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 800);

    const t3 = setTimeout(() => setReady(true), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [logoScale, logoOpacity, logoRotate, textOpacity, textY, taglineOpacity, glowOpacity, glowScale]);

  useEffect(() => {
    if (!ready || loading) return;
    // Fade out, poi redirect
    Animated.timing(exitOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
      if (user) router.replace('/(tabs)/home');
      else router.replace('/(auth)/login');
    });
  }, [ready, loading, user, router, exitOpacity]);

  const spin = logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['-15deg', '0deg'] });

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]} testID="splash-screen">
      {/* Glow background */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.glow2, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }, { rotate: spin }] }]}>
        <View style={styles.logoOuterGlow}>
          <View style={styles.logoCircle}>
            <Ionicons name="calendar" size={60} color="#ffffff" />
          </View>
        </View>
      </Animated.View>

      {/* Nome app */}
      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }], marginTop: 36, alignItems: 'center' }}>
        <Text style={styles.brand}>
          Day<Text style={styles.brandAccent}>Sync</Text>
        </Text>
        <View style={styles.underline} />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Organizza la tua giornata
      </Animated.Text>

      {/* Dots */}
      <Animated.View style={[styles.dots, { opacity: taglineOpacity }]}>
        <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
        <View style={[styles.dot, { backgroundColor: theme.colors.accent2 }]} />
        <View style={[styles.dot, { backgroundColor: theme.colors.accent3 }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: theme.colors.accent, opacity: 0.08, top: '18%' },
  glow2: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: theme.colors.accent2, opacity: 0.06, bottom: '12%', left: '12%' },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logoOuterGlow: { width: 156, height: 156, borderRadius: 44, backgroundColor: 'rgba(167,139,250,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)' },
  logoCircle: { width: 124, height: 124, borderRadius: 34, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center', shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 20 },
  brand: { fontSize: 60, fontWeight: '800', color: '#ffffff', letterSpacing: -1.5 },
  brandAccent: { color: '#ffffff' },
  underline: { width: 64, height: 5, borderRadius: 3, backgroundColor: theme.colors.accent, marginTop: 16 },
  tagline: { color: '#fafafa', fontSize: 16, marginTop: 16, letterSpacing: 1.5, fontWeight: '500' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 40 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
