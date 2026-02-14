import { Stack } from 'expo-router';
import { CustomerProvider } from '../contexts/CustomerContext';
import { JobProvider } from '../contexts/JobContext';

export default function RootLayout() {
  return (
    <CustomerProvider>
      <JobProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="job/[id]" options={{ title: 'Job Details' }} />
          <Stack.Screen name="customer/[id]" options={{ title: 'Customer Details' }} />
          <Stack.Screen name="estimate/[id]" options={{ title: 'Estimate' }} />
          <Stack.Screen name="invoice/[id]" options={{ title: 'Invoice' }} />
        </Stack>
      </JobProvider>
    </CustomerProvider>
  );
}
