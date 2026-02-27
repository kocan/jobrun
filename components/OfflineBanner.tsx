import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../lib/network';

export function OfflineBanner() {
  const { isOffline } = useNetwork();
  if (!isOffline) return null;
  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLabel="You're offline — changes will sync when connected"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.text}>Offline — changes will sync when reconnected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  icon: {
    fontSize: 13,
  },
  text: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '600',
  },
});
