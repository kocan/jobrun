import { View, Text, Pressable, Modal, FlatList, Platform } from 'react-native';
import { PriceBookService } from '../lib/types';
import { detailStyles as styles } from './DetailScreen';

interface ServicePickerProps {
  visible: boolean;
  services: PriceBookService[];
  onSelect: (service: PriceBookService) => void;
  onClose: () => void;
}

export function ServicePicker({ visible, services, onSelect, onClose }: ServicePickerProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, Platform.OS === 'android' && styles.modalContainerAndroid]}>
        <View style={styles.modalHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close service picker" onPress={onClose}>
            <Text style={styles.headerBtn}>Close</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Add Service</Text>
          <View style={{ width: 50 }} />
        </View>
        <FlatList
          data={services}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.name}`}
              style={styles.pickerRow}
              onPress={() => onSelect(item)}
            >
              <Text style={styles.pickerRowName}>{item.name}</Text>
              <Text style={styles.pickerRowSub}>${item.price.toFixed(2)} · {item.estimatedDuration}min</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No active services. Add some in Price Book.</Text>}
        />
      </View>
    </Modal>
  );
}
