import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { CustomerProvider } from '../contexts/CustomerContext';
import { JobProvider } from '../contexts/JobContext';
import { PriceBookProvider } from '../contexts/PriceBookContext';
import { EstimateProvider } from '../contexts/EstimateContext';
import { InvoiceProvider } from '../contexts/InvoiceContext';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext';

function RootNavigator() {
  const { isOnboardingComplete, loading } = useSettings();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!isOnboardingComplete && !inOnboarding) {
      router.replace('/onboarding');
    } else if (isOnboardingComplete && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isOnboardingComplete, loading, segments]);

  if (loading) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
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
    </SettingsProvider>
  );
}
