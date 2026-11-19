import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { colors } from '../src/theme/colors';
import { useAuthStore } from '../src/store/authStore';
import { applyRtlForLocale, useLocaleStore } from '../src/i18n/localeStore';
import { initializeAds } from '../src/services/ads';

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

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

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

  if (!fontsLoaded) return null;

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
