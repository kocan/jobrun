import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { getPendingSyncCount } from '../lib/db/syncQueue';
import { useNetwork } from '../lib/network';
import { theme } from '../lib/theme';

type SyncState = 'synced' | 'pending' | 'offline';

export function SyncStatusBadge() {
  const { isOffline } = useNetwork();
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(() => {
    try {
      const count = getPendingSyncCount();
      setPendingCount(count);
    } catch {
      // DB not ready yet
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refresh]);

  const state: SyncState = isOffline ? 'offline' : pendingCount > 0 ? 'pending' : 'synced';

  const config = {
    synced: { label: 'All synced', color: theme.colors.status.completed },
    pending: { label: `${pendingCount} pending`, color: theme.colors.status.inProgress },
    offline: { label: 'Offline', color: theme.colors.status.cancelled },
  }[state];

  return (
    <View
      style={styles.container}
      accessibilityRole="status"
      accessibilityLabel={`Sync status: ${config.label}`}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
