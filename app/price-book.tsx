import { View, Text, SectionList, Pressable, Switch, Alert, StyleSheet, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useMemo } from 'react';
import { usePriceBook } from '../contexts/PriceBookContext';
import { verticals } from '../constants/verticals';
import { PriceBookService } from '../lib/types';

export default function PriceBookScreen() {
  const router = useRouter();
  const { services, updateService, deleteService, resetToDefaults, loading } = usePriceBook();

  const sections = useMemo(() => {
    const grouped: Record<string, PriceBookService[]> = {};
    for (const s of [...services].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const cat = s.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    }
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [services]);

  const handleToggle = (service: PriceBookService) => {
    updateService(service.id, { isActive: !service.isActive });
  };

  const handleDelete = (service: PriceBookService) => {
    Alert.alert('Delete Service', `Delete "${service.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteService(service.id) },
    ]);
  };

  const handleReset = () => {
    // Use first vertical as default; in a real app, this would come from user settings
    const vertical = verticals[0];
    Alert.alert(
      'Reset to Defaults',
      `This will replace all services with the defaults for ${vertical.name}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetToDefaults(vertical.defaultServices) },
      ]
    );
  };

  const formatPrice = (p: number) => `$${p.toFixed(2)}`;
  const formatDuration = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`;

  return (
    <>
      <Stack.Screen options={{ title: 'Price Book' }} />
      <View style={styles.container}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/price-book-edit?id=${item.id}`)}
              onLongPress={() => handleDelete(item)}
            >
              <View style={styles.rowLeft}>
                <Text style={[styles.serviceName, !item.isActive && styles.inactive]}>{item.name}</Text>
                <Text style={styles.serviceDetail}>
                  {formatPrice(item.price)} · {formatDuration(item.estimatedDuration)}
                </Text>
              </View>
              <Switch
                value={item.isActive}
                onValueChange={() => handleToggle(item)}
                trackColor={{ true: '#EA580C' }}
              />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{loading ? 'Loading...' : 'No services yet'}</Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <Pressable style={styles.resetBtn} onPress={handleReset}>
                <Text style={styles.resetBtnText}>Reset to Defaults</Text>
              </Pressable>
            </View>
          }
          stickySectionHeadersEnabled={false}
        />
        <Pressable style={styles.fab} onPress={() => router.push('/price-book-edit?id=new')}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  sectionHeader: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#666', textTransform: 'uppercase' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  rowLeft: { flex: 1, marginRight: 12 },
  serviceName: { fontSize: 17, color: '#111', fontWeight: '500' },
  inactive: { color: '#999' },
  serviceDetail: { fontSize: 14, color: '#666', marginTop: 2 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
  footer: { padding: 24, alignItems: 'center' },
  resetBtn: { padding: 12 },
  resetBtnText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#EA580C', alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }, android: { elevation: 6 } }),
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '400', marginTop: -2 },
});
