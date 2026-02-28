import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useJobs } from '../contexts/JobContext';
import { useEstimates } from '../contexts/EstimateContext';
import { useInvoices } from '../contexts/InvoiceContext';
import { TimelineItem, CustomerNote } from '../lib/types';
import * as notesRepo from '../lib/db/repositories/customerNotes';
import { theme } from '../lib/theme';

const ICON_CONFIG: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  job: { name: 'construct-outline', color: theme.colors.status.scheduled },
  estimate: { name: 'document-text-outline', color: '#8B5CF6' },
  invoice: { name: 'receipt-outline', color: theme.colors.status.completed },
  note: { name: 'chatbubble-outline', color: theme.colors.primary },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildTimeline(
  customerId: string,
  getJobsByCustomer: (id: string) => { id: string; title: string; status: string; scheduledDate: string; total: number; createdAt: string }[],
  getEstimatesByCustomer: (id: string) => { id: string; status: string; total: number; createdAt: string }[],
  getInvoicesByCustomer: (id: string) => { id: string; invoiceNumber: string; status: string; total: number; createdAt: string }[],
  notes: CustomerNote[],
): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const job of getJobsByCustomer(customerId)) {
    items.push({
      id: `job-${job.id}`,
      type: 'job',
      title: job.title,
      subtitle: `$${job.total.toFixed(2)} · ${job.status}`,
      date: job.scheduledDate || job.createdAt,
      status: job.status,
      entityId: job.id,
    });
  }

  for (const est of getEstimatesByCustomer(customerId)) {
    items.push({
      id: `estimate-${est.id}`,
      type: 'estimate',
      title: `Estimate · $${est.total.toFixed(2)}`,
      subtitle: est.status,
      date: est.createdAt,
      status: est.status,
      entityId: est.id,
    });
  }

  for (const inv of getInvoicesByCustomer(customerId)) {
    items.push({
      id: `invoice-${inv.id}`,
      type: 'invoice',
      title: `${inv.invoiceNumber} · $${inv.total.toFixed(2)}`,
      subtitle: inv.status,
      date: inv.createdAt,
      status: inv.status,
      entityId: inv.id,
    });
  }

  for (const note of notes) {
    items.push({
      id: `note-${note.id}`,
      type: 'note',
      title: 'Note',
      subtitle: note.noteText,
      date: note.createdAt,
      entityId: note.id,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}

interface CustomerTimelineProps {
  customerId: string;
}

export default function CustomerTimeline({ customerId }: CustomerTimelineProps) {
  const router = useRouter();
  const { getJobsByCustomer } = useJobs();
  const { getEstimatesByCustomer } = useEstimates();
  const { getInvoicesByCustomer } = useInvoices();

  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);

  const refreshNotes = useCallback(() => {
    setNotes(notesRepo.getNotesByCustomer(customerId));
  }, [customerId]);

  useEffect(() => {
    refreshNotes();
  }, [refreshNotes]);

  const handleAddNote = () => {
    if (!noteText.trim()) {
      Alert.alert('Required', 'Please enter a note');
      return;
    }
    const note: CustomerNote = {
      id: Crypto.randomUUID(),
      customerId,
      noteText: noteText.trim(),
      createdAt: new Date().toISOString(),
    };
    notesRepo.addNote(note);
    setNotes((prev) => [note, ...prev]);
    setNoteText('');
    setShowAddNote(false);
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert('Delete Note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          notesRepo.deleteNote(noteId);
          setNotes((prev) => prev.filter((n) => n.id !== noteId));
        },
      },
    ]);
  };

  const handleItemPress = (item: TimelineItem) => {
    if (item.type === 'job') {
      router.push({ pathname: '/job/[id]', params: { id: item.entityId } });
    } else if (item.type === 'estimate') {
      router.push({ pathname: '/estimate/[id]', params: { id: item.entityId } });
    } else if (item.type === 'invoice') {
      router.push({ pathname: '/invoice/[id]', params: { id: item.entityId } });
    }
  };

  const timeline = buildTimeline(
    customerId,
    getJobsByCustomer,
    getEstimatesByCustomer,
    getInvoicesByCustomer,
    notes,
  );

  return (
    <View>
      <Text style={styles.sectionTitle}>Timeline</Text>

      {showAddNote ? (
        <View style={styles.addNoteForm}>
          <TextInput
            accessibilityRole="text"
            accessibilityLabel="Note text"
            style={styles.noteInput}
            placeholder="Add a note..."
            value={noteText}
            onChangeText={setNoteText}
            multiline
            autoFocus
          />
          <View style={styles.addNoteActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={styles.cancelNoteBtn}
              onPress={() => { setShowAddNote(false); setNoteText(''); }}
            >
              <Text style={styles.cancelNoteBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save note"
              style={styles.saveNoteBtn}
              onPress={handleAddNote}
            >
              <Text style={styles.saveNoteBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a note"
          style={styles.addNoteBtn}
          onPress={() => setShowAddNote(true)}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.addNoteBtnText}>Quick Note</Text>
        </Pressable>
      )}

      {timeline.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={32} color={theme.colors.gray300} />
          <Text style={styles.emptyText}>No activity yet.</Text>
        </View>
      ) : (
        timeline.map((item, index) => {
          const icon = ICON_CONFIG[item.type] || ICON_CONFIG.note;
          const isLast = index === timeline.length - 1;
          const isNote = item.type === 'note';

          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.type}: ${item.title}`}
              style={styles.entry}
              onPress={() => handleItemPress(item)}
              onLongPress={isNote ? () => handleDeleteNote(item.entityId) : undefined}
            >
              <View style={styles.iconCol}>
                <View style={[styles.iconDot, { backgroundColor: icon.color + '18' }]}>
                  <Ionicons name={icon.name} size={16} color={icon.color} />
                </View>
                {!isLast && <View style={styles.connector} />}
              </View>
              <View style={styles.entryContent}>
                <View style={styles.entryHeader}>
                  <Text style={[styles.entryType, { color: icon.color }]}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </Text>
                  <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
                </View>
                <Text style={styles.entryTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.entrySubtitle} numberOfLines={2}>{item.subtitle}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  addNoteBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  addNoteForm: {
    backgroundColor: theme.colors.gray50,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  addNoteActions: { flexDirection: 'row', gap: 10 },
  cancelNoteBtn: {
    backgroundColor: theme.colors.gray300,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelNoteBtnText: { color: theme.colors.gray700, fontSize: 15, fontWeight: '600' },
  saveNoteBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveNoteBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: theme.colors.gray400, marginTop: 8 },
  entry: { flexDirection: 'row', marginBottom: 0 },
  iconCol: { width: 36, alignItems: 'center' },
  iconDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.gray200,
    marginTop: 4,
  },
  entryContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.gray200,
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  entryType: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryDate: { fontSize: 12, color: theme.colors.gray400 },
  entryTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  entrySubtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 2 },
});
