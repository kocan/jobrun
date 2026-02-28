import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { type EventSubscription } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
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
import { registerForPushNotifications } from '../lib/notifications';
import { NotificationType } from '../lib/types';

function RootNavigator() {
  const { isOnboardingComplete, loading } = useSettings();
  const { user, loading: authLoading, skippedAuth, isConfigured } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const responseListener = useRef<EventSubscription | undefined>(undefined);

  // Register for push notifications once onboarding is complete
  useEffect(() => {
    if (!isOnboardingComplete) return;
    registerForPushNotifications();
  }, [isOnboardingComplete]);

  // Handle notification taps — navigate to the relevant screen
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, string>
        | undefined;
      if (!data) return;

      const type = data.type as NotificationType | undefined;

      if (type === 'payment_received' && data.invoiceId) {
        router.push(`/invoice/${data.invoiceId}`);
      } else if (type === 'estimate_accepted' && data.estimateId) {
        router.push(`/estimate/${data.estimateId}`);
      } else if (type === 'appointment_reminder' && data.jobId) {
        router.push(`/job/${data.jobId}`);
      }
    });

    return () => {
      responseListener.current?.remove();
    };
  }, [router]);

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
