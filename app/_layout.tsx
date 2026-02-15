import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { CustomerProvider } from '../contexts/CustomerContext';
import { JobProvider } from '../contexts/JobContext';
import { PriceBookProvider } from '../contexts/PriceBookContext';
import { EstimateProvider } from '../contexts/EstimateContext';
import { InvoiceProvider } from '../contexts/InvoiceContext';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { NetworkProvider } from '../lib/network';
import { OfflineBanner } from '../components/OfflineBanner';
import { initializeDatabase } from '../lib/db/database';
import { migrateFromAsyncStorage } from '../lib/db/migration';

function RootNavigator() {
  const { isOnboardingComplete, loading } = useSettings();
  const { user, loading: authLoading, skippedAuth, isConfigured } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || authLoading) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inAuth = segments[0] === 'auth';

    if (!isOnboardingComplete && !inOnboarding) {
      router.replace('/onboarding');
    } else if (isOnboardingComplete && inOnboarding) {
      if (!isConfigured || user || skippedAuth) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/login');
      }
    } else if (isOnboardingComplete && inAuth && (user || skippedAuth)) {
      router.replace('/(tabs)');
    }
  }, [isOnboardingComplete, loading, authLoading, segments, user, skippedAuth, isConfigured]);

  if (loading || authLoading) return null;

  return (
    <>
      <OfflineBanner />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Job Details' }} />
        <Stack.Screen name="customer/[id]" options={{ title: 'Customer Details' }} />
        <Stack.Screen name="estimate/[id]" options={{ title: 'Estimate' }} />
        <Stack.Screen name="invoice/[id]" options={{ title: 'Invoice' }} />
        <Stack.Screen name="price-book" options={{ title: 'Price Book' }} />
        <Stack.Screen name="price-book-edit" options={{ title: 'Edit Service' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}

function DatabaseInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      initializeDatabase();
      await migrateFromAsyncStorage();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#EA580C" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <DatabaseInitializer>
      <NetworkProvider>
        <SettingsProvider>
          <AuthProvider>
            <CustomerProvider>
              <JobProvider>
                <PriceBookProvider>
                  <EstimateProvider>
                    <InvoiceProvider>
                      <RootNavigator />
                    </InvoiceProvider>
                  </EstimateProvider>
                </PriceBookProvider>
              </JobProvider>
            </CustomerProvider>
          </AuthProvider>
        </SettingsProvider>
      </NetworkProvider>
    </DatabaseInitializer>
  );
}
