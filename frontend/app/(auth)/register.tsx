import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/lib/auth';
import { theme } from '../../src/lib/theme';

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }
    if (password.length < 6) {
      setError('Password minimo 6 caratteri');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim() || undefined);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e.message || 'Errore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="register-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.logo}>DaySync</Text>
            <Text style={styles.tagline}>Crea il tuo account</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Registrati</Text>

            <Text style={styles.label}>Nome (opzionale)</Text>
            <TextInput
              testID="register-name-input"
              style={styles.input}
              placeholder="Mario"
              placeholderTextColor={theme.colors.textDim}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="register-email-input"
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
              testID="register-password-input"
              style={styles.input}
              placeholder="Almeno 6 caratteri"
              placeholderTextColor={theme.colors.textDim}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text style={styles.error} testID="register-error">{error}</Text> : null}

            <TouchableOpacity
              testID="register-submit-btn"
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              disabled={loading}
              onPress={handleRegister}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Creazione...' : 'Crea account'}</Text>
            </TouchableOpacity>

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity testID="go-to-login-btn" style={styles.linkBtn}>
                <Text style={styles.linkText}>
                  Hai già un account? <Text style={styles.linkTextBold}>Accedi</Text>
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
  title: { ...theme.font.h2, color: theme.colors.text, marginBottom: 8 },
  label: { ...theme.font.small, color: theme.colors.textMuted, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: theme.colors.text, fontSize: 15 },
  error: { color: theme.colors.danger, marginTop: 12, fontSize: 13 },
  primaryBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  primaryBtnText: { color: theme.colors.primaryFg, fontSize: 15, fontWeight: '600' },
  linkBtn: { marginTop: 18, alignItems: 'center' },
  linkText: { color: theme.colors.textMuted, fontSize: 14 },
  linkTextBold: { color: theme.colors.text, fontWeight: '600' },
});
