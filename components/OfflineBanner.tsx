import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../lib/network';

export function OfflineBanner() {
  const { isOffline } = useNetwork();
  if (!isOffline) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You're offline — changes will sync when connected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '500',
  },
});
