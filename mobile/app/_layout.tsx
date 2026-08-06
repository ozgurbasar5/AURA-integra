import { useEffect, useRef } from 'react'
import { StatusBar } from 'expo-status-bar'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'

import { useColorScheme } from '@/components/useColorScheme'
import { ProfileGate } from '@/components/ProfileGate'
import { ToastBanner } from '@/components/ui/ToastBanner'
import { AuthProvider, useAuth } from '@/lib/auth'
import { setUnauthorizedHandler } from '@/lib/api'
import { formatFlushResult, startOfflineAutoSync } from '@/lib/offline-sync'
import { getNotificationRoute } from '@/lib/push'
import { showToast } from '@/lib/toast'
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

function SessionAndSyncEffects() {
  const { signOut } = useAuth()
  const router = useRouter()
  const segments = useSegments()
  const segmentsRef = useRef(segments)
  const alertShown = useRef(false)

  segmentsRef.current = segments

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (segmentsRef.current[0] === 'login') return
      showToast('Oturum süresi doldu — tekrar giriş yapın', 'warning', 3500)
      setTimeout(() => {
        void signOut()
        router.replace('/login')
      }, 400)
    })
    return () => setUnauthorizedHandler(null)
  }, [signOut, router])

  useEffect(() => {
    const stop = startOfflineAutoSync(result => {
      if (result.ok === 0 && result.fail === 0) return
      if (alertShown.current) return
      alertShown.current = true
      showToast(formatFlushResult(result), result.fail > 0 ? 'warning' : 'success', 5000)
      setTimeout(() => { alertShown.current = false }, 5000)
    })
    return stop
  }, [])

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined
      const route = getNotificationRoute(data)
      if (route) router.push(route as never)
    })
    return () => sub.remove()
  }, [router])

  return null
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <AppThemeProvider>
            <AuthProvider>
              <TenantProvider>
                <PartsCatalogProvider>
                  <RootLayoutNav />
                </PartsCatalogProvider>
              </TenantProvider>
            </AuthProvider>
          </AppThemeProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
      <ToastBanner />
      <SessionAndSyncEffects />
      <AuthGate>
        <ProfileGate>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="atolye/[id]" options={{ title: 'İş detayı' }} />
            <Stack.Screen name="yenilikler" options={{ title: 'Yenilikler' }} />
            <Stack.Screen name="gorunum" options={{ title: 'Görünüm', presentation: 'modal' }} />
          </Stack>
        </ProfileGate>
      </AuthGate>
    </ThemeProvider>
  )
}
