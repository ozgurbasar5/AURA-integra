import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/api'

const HERO_FROM = '#0e3d4f'
const HERO_TO = '#0e8fad'
const CTA = '#0284c7'

export default function LoginScreen() {
  const { signIn, signOut, configured, setMfaPending } = useAuth()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
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
      try {
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
          return
        }
      } catch (mfaErr) {
        const msg = mfaErr instanceof Error ? mfaErr.message : ''
        // Endpoint/SMTP yoksa saha girişi engellenmesin
        if (/404|503|SMTP|yapılandır|not found/i.test(msg)) {
          /* MFA opsiyonel */
        } else {
          setError(`Doğrulama başlatılamadı: ${msg}`)
          setMfaPending(false)
          await signOut()
          return
        }
      }
      setMfaPending(false)
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
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
          <View style={styles.heroWash} />
          <View style={styles.mark}>
            <Text style={styles.markLetter}>A</Text>
          </View>
          <Text style={styles.brand}>AURA İntegra</Text>
          <Text style={styles.tagline}>Bayi mobil paneli — atölye, satış ve kasa cebinizde</Text>
          <View style={styles.featureRow}>
            {[
              { icon: 'wrench' as const, label: 'Atölye' },
              { icon: 'shopping-cart' as const, label: 'POS' },
              { icon: 'money' as const, label: 'Kasa' },
            ].map(f => (
              <View key={f.label} style={styles.featureChip}>
                <FontAwesome name={f.icon} size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.featureText}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>
            {mfaStep ? 'E-posta doğrulama' : 'Giriş yapın'}
          </Text>
          <Text style={styles.sheetSub}>
            {mfaStep
              ? `Kod gönderildi: ${mfaHint || 'e-posta'}`
              : 'Web paneli ile aynı hesabınızı kullanın'}
          </Text>

          {!configured && (
            <Text style={styles.warn}>
              Env eksik: mobile/.env içine EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY ekleyin.
            </Text>
          )}

          {mfaStep ? (
            <>
              <Text style={styles.label}>Doğrulama kodu</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={mfaCode}
                onChangeText={setMfaCode}
                placeholder="6 haneli kod"
                placeholderTextColor="#94a3b8"
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
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Şifre</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={[styles.input, styles.passInput]}
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                />
                <Pressable onPress={() => setShowPass(v => !v)} style={styles.eye} hitSlop={8}>
                  <FontAwesome name={showPass ? 'eye-slash' : 'eye'} size={18} color="#64748b" />
                </Pressable>
              </View>

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
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f7fb' },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: HERO_FROM,
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 10,
    overflow: 'hidden',
  },
  heroWash: {
    position: 'absolute',
    right: -40,
    top: -20,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: HERO_TO,
    opacity: 0.45,
  },
  mark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  markLetter: { color: '#fff', fontWeight: '900', fontSize: 22 },
  brand: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  tagline: { color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 20, maxWidth: 300 },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  featureText: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: '700' },
  sheet: {
    marginTop: -18,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  sheetSub: { color: '#64748b', fontSize: 13, marginBottom: 10 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  passRow: { position: 'relative' },
  passInput: { paddingRight: 44 },
  eye: { position: 'absolute', right: 14, top: 14 },
  btn: {
    marginTop: 16,
    backgroundColor: CTA,
    borderRadius: 14,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  error: { color: '#dc2626', marginTop: 8, fontSize: 13 },
  warn: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 10,
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
})
