import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { AuraColors } from '@/constants/AuraColors'

export default function LoginScreen() {
  const { signIn, configured, setMfaPending } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mfaStep, setMfaStep] = useState(false)
  const [mfaToken, setMfaToken] = useState('')
  const [mfaHint, setMfaHint] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  async function onSubmit() {
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      const challenge = await apiFetch('/api/auth/mobile-mfa', {
        method: 'POST',
        body: JSON.stringify({ action: 'challenge' }),
      }) as { required?: boolean; mfa_token?: string; email_hint?: string; message?: string }
      if (challenge.required && challenge.mfa_token) {
        setMfaPending(true)
        setMfaToken(challenge.mfa_token)
        setMfaHint(challenge.email_hint || '')
        setMfaStep(true)
        if (challenge.message) setError(challenge.message)
      } else {
        setMfaPending(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  async function onVerifyMfa() {
    setError('')
    setLoading(true)
    try {
      await apiFetch('/api/auth/mobile-mfa', {
        method: 'POST',
        body: JSON.stringify({ action: 'verify', code: mfaCode, mfa_token: mfaToken }),
      })
      setMfaStep(false)
      setMfaPending(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kod hatalı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>AURA İntegra</Text>
        <Text style={styles.sub}>{mfaStep ? 'E-posta doğrulama' : 'Bayi mobil paneli'}</Text>

        {!configured && (
          <Text style={styles.warn}>
            Env eksik: mobile/.env içine EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY ekleyin.
          </Text>
        )}

        {mfaStep ? (
          <>
            <Text style={styles.hint}>Kod gönderildi: {mfaHint || 'e-posta'}</Text>
            <Text style={styles.label}>Doğrulama kodu</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={mfaCode}
              onChangeText={setMfaCode}
              placeholder="6 haneli kod"
              placeholderTextColor={AuraColors.muted}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={() => void onVerifyMfa()}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Doğrula</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              placeholderTextColor={AuraColors.muted}
            />

            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={AuraColors.muted}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={() => void onSubmit()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Giriş Yap</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AuraColors.primaryDark,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    gap: 8,
  },
  brand: {
    fontSize: 24,
    fontWeight: '900',
    color: AuraColors.primaryDark,
  },
  sub: {
    color: AuraColors.muted,
    marginBottom: 12,
  },
  hint: { color: AuraColors.muted, fontSize: 13, marginBottom: 4 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: AuraColors.muted,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: AuraColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: AuraColors.text,
    backgroundColor: '#f8fafc',
  },
  btn: {
    marginTop: 16,
    backgroundColor: AuraColors.primary,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  error: { color: AuraColors.danger, marginTop: 8 },
  warn: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 10,
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 8,
  },
})
