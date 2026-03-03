import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../lib/network';
import { useTheme } from '../contexts/ThemeContext';

export function OfflineBanner() {
  const { isOffline } = useNetwork();
  const { isDark } = useTheme();
  if (!isOffline) return null;
  return (
    <View
      style={[styles.banner, isDark ? styles.bannerDark : styles.bannerLight]}
      accessibilityRole="alert"
      accessibilityLabel="You're offline — changes will sync when connected"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.text, isDark ? styles.textDark : styles.textLight]}>
        Offline — changes will sync when reconnected
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 1,
  },
  bannerLight: {
    backgroundColor: '#FEF3C7',
    borderBottomColor: '#FDE68A',
  },
  bannerDark: {
    backgroundColor: '#451A03',
    borderBottomColor: '#78350F',
  },
  icon: {
    fontSize: 13,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textLight: {
    color: '#92400E',
  },
  textDark: {
    color: '#FCD34D',
  },
});
