import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Appearance, StyleSheet, ActivityIndicator, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { colors } from '../src/theme/colors';
import { useAuthStore } from '../src/store/authStore';
import { applyRtlForLocale, useLocaleStore } from '../src/i18n/localeStore';
import { initializeAds } from '../src/services/ads';

// The palette is light-only for now. Pin the whole app to light so every native
// piece — Liquid Glass, nav bars, toolbars, keyboards, switches — matches it even
// when the phone is in Dark Mode. Sets overrideUserInterfaceStyle on all windows,
// which also covers Expo Go (where app.json's userInterfaceStyle isn't applied).
Appearance.setColorScheme('light');

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const isOnAuthScreen = segments[0] === 'auth';

    if (!user && !isOnAuthScreen) {
      router.replace('/auth');
    } else if (
      user &&
      isOnAuthScreen &&
      user.provider !== 'anonymous'
    ) {
      // Signed-in users skip the auth screen; guests can open it to upgrade
      router.replace('/');
    }
  }, [user, isInitialized, segments]);

  if (!isInitialized) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, []);

  useEffect(() => {
    applyRtlForLocale(useLocaleStore.getState().locale);
    const unsub = useLocaleStore.persist.onFinishHydration(() => {
      applyRtlForLocale(useLocaleStore.getState().locale);
    });
    return unsub;
  }, []);

  useEffect(() => {
    void initializeAds();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="dark" />
        <AuthGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          />
        </AuthGuard>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
