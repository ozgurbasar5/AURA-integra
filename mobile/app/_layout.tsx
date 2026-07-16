import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import 'react-native-reanimated'

import { useColorScheme } from '@/components/useColorScheme'
import { AuthProvider, useAuth } from '@/lib/auth'
import { AuraColors } from '@/constants/AuraColors'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

SplashScreen.preventAutoHideAsync()

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, session, mfaPending } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === 'login'
    if (!session && !inAuth) {
      router.replace('/login')
    } else if (session && mfaPending && !inAuth) {
      router.replace('/login')
    } else if (session && !mfaPending && inAuth) {
      router.replace('/(tabs)')
    }
  }, [loading, session, mfaPending, segments, router])

  return <>{children}</>
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  })

  useEffect(() => {
    if (error) {
      console.warn('Font yüklenemedi, devam ediliyor:', error)
      SplashScreen.hideAsync()
    }
  }, [error])

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync()
  }, [loaded])

  // Font gecikse bile loading'de kalma
  useEffect(() => {
    const t = setTimeout(() => { SplashScreen.hideAsync() }, 4000)
    return () => clearTimeout(t)
  }, [])

  if (!loaded && !error) return null

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  )
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const theme = colorScheme === 'dark' ? DarkTheme : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: AuraColors.primary,
      background: AuraColors.bg,
      card: AuraColors.card,
      text: AuraColors.text,
      border: AuraColors.border,
    },
  }

  return (
    <ThemeProvider value={theme}>
      <AuthGate>
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="atolye/[id]" options={{ title: 'İş detayı' }} />
          <Stack.Screen name="yenilikler" options={{ title: 'Yenilikler' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Bilgi' }} />
        </Stack>
      </AuthGate>
    </ThemeProvider>
  )
}
