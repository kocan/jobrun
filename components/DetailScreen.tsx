import { View, Text, Pressable } from 'react-native';
import { useDetailStyles } from '../styles/detailScreen';

// Re-export shared components and styles so existing imports keep working
export { useDetailStyles } from '../styles/detailScreen';
export { Field } from './shared/Field';
export { InfoRow } from './shared/InfoRow';

/**
 * Shared components for Job / Estimate / Invoice detail screens.
 * Field and InfoRow have been extracted to components/shared/.
 * Styles have been extracted to styles/detailScreen.ts.
 */

/* ── FormSectionHeader (visual divider for long forms) ── */

export function FormSectionHeader({ title }: { title: string }) {
  const styles = useDetailStyles();
  return (
    <View style={styles.formSectionHeader}>
      <View style={styles.formSectionLine} />
      <Text style={styles.formSectionText}>{title}</Text>
      <View style={styles.formSectionLine} />
    </View>
  );
}

/* ── StatusBadge ───────────────────────────────────────── */

export function StatusBadge({ label, color }: { label: string; color: string }) {
  const styles = useDetailStyles();
  return (
    <View style={[styles.statusBadge, { backgroundColor: color }]}>
      <Text style={styles.statusBadgeText}>{label}</Text>
    </View>
  );
}

/* ── ActionButton ──────────────────────────────────────── */

export function ActionButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  const styles = useDetailStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={[styles.actionBtn, { backgroundColor: color }]} onPress={onPress}>
      <Text style={styles.actionBtnText}>{label}</Text>
    </Pressable>
  );
}

/* ── SectionTitle ──────────────────────────────────────── */

export function SectionTitle({ title }: { title: string }) {
  const styles = useDetailStyles();
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

/* ── SaveButton / CancelButton ─────────────────────────── */

export function SaveButton({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useDetailStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Save changes" style={styles.saveBtn} onPress={onPress}>
      <Text style={styles.saveBtnText}>{label}</Text>
    </Pressable>
  );
}

export function CancelButton({ onPress }: { onPress: () => void }) {
  const styles = useDetailStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Cancel changes" style={styles.cancelBtn} onPress={onPress}>
      <Text style={styles.cancelBtnText}>Cancel</Text>
    </Pressable>
  );
}

export function DeleteButton({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useDetailStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Delete record" style={styles.deleteBtn} onPress={onPress}>
      <Text style={styles.deleteBtnText}>{label}</Text>
    </Pressable>
  );
}
