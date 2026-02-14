import { Stack } from 'expo-router';
import { CustomerProvider } from '../contexts/CustomerContext';

export default function RootLayout() {
  return (
    <CustomerProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Job Details' }} />
        <Stack.Screen name="customer/[id]" options={{ title: 'Customer Details' }} />
        <Stack.Screen name="estimate/[id]" options={{ title: 'Estimate' }} />
        <Stack.Screen name="invoice/[id]" options={{ title: 'Invoice' }} />
      </Stack>
    </CustomerProvider>
  );
}
