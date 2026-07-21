import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { useColorScheme } from '@/components/useColorScheme'
import { AuthProvider, useAuth } from '@/lib/auth'
import { AppThemeProvider, useAppTheme } from '@/lib/ThemeContext'
import { TenantProvider } from '@/lib/TenantContext'
import { PartsCatalogProvider } from '@/lib/PartsCatalog'

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

  useEffect(() => {
    const t = setTimeout(() => { SplashScreen.hideAsync() }, 4000)
    return () => clearTimeout(t)
  }, [])

  if (!loaded && !error) return null

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <PartsCatalogProvider>
              <RootLayoutNav />
            </PartsCatalogProvider>
          </TenantProvider>
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  )
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const { colors, isDark, appearance } = useAppTheme()
  const forceDark = appearance.colorMode === 'dark' || (appearance.colorMode === 'system' && colorScheme === 'dark')
  const theme = forceDark || isDark ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  }

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthGate>
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="atolye/[id]" options={{ title: 'İş detayı' }} />
          <Stack.Screen name="yenilikler" options={{ title: 'Yenilikler' }} />
          <Stack.Screen name="gorunum" options={{ title: 'Görünüm', presentation: 'modal' }} />
        </Stack>
      </AuthGate>
    </ThemeProvider>
  )
}
