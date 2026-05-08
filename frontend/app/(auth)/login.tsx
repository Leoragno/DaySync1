import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/lib/auth';
import { theme } from '../../src/lib/theme';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e.message || 'Errore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="login-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.logo}>DaySync</Text>
            <Text style={styles.tagline}>Organizza la tua giornata</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Accedi</Text>
            <Text style={styles.subtitle}>Bentornato</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="login-email-input"
              style={styles.input}
              placeholder="mario@esempio.it"
              placeholderTextColor={theme.colors.textDim}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              testID="login-password-input"
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textDim}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text style={styles.error} testID="login-error">{error}</Text> : null}

            <TouchableOpacity
              testID="login-submit-btn"
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              disabled={loading}
              onPress={handleLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Accesso...' : 'Accedi'}</Text>
            </TouchableOpacity>

            <Link href="/(auth)/register" asChild>
              <TouchableOpacity testID="go-to-register-btn" style={styles.linkBtn}>
                <Text style={styles.linkText}>
                  Non hai un account? <Text style={styles.linkTextBold}>Registrati</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 40 },
  logo: { ...theme.font.h1, color: theme.colors.text, fontSize: 40 },
  tagline: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 6 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  title: { ...theme.font.h2, color: theme.colors.text },
  subtitle: { ...theme.font.small, color: theme.colors.textMuted, marginBottom: 24, marginTop: 4 },
  label: { ...theme.font.small, color: theme.colors.textMuted, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: theme.colors.text, fontSize: 15 },
  error: { color: theme.colors.danger, marginTop: 12, fontSize: 13 },
  primaryBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  primaryBtnText: { color: theme.colors.primaryFg, fontSize: 15, fontWeight: '600' },
  linkBtn: { marginTop: 18, alignItems: 'center' },
  linkText: { color: theme.colors.textMuted, fontSize: 14 },
  linkTextBold: { color: theme.colors.text, fontWeight: '600' },
});
