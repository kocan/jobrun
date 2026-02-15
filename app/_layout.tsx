import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { CustomerProvider } from '../contexts/CustomerContext';
import { JobProvider } from '../contexts/JobContext';
import { PriceBookProvider } from '../contexts/PriceBookContext';
import { EstimateProvider } from '../contexts/EstimateContext';
import { InvoiceProvider } from '../contexts/InvoiceContext';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

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
      // Onboarding done — check auth
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
  );
}

export default function RootLayout() {
  return (
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
  );
}
