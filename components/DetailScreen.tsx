import { View, Text, Pressable } from 'react-native';
import { detailStyles } from '../styles/detailScreen';

// Re-export shared components and styles so existing imports keep working
export { detailStyles } from '../styles/detailScreen';
export { Field } from './shared/Field';
export { InfoRow } from './shared/InfoRow';

/**
 * Shared components for Job / Estimate / Invoice detail screens.
 * Field and InfoRow have been extracted to components/shared/.
 * Styles have been extracted to styles/detailScreen.ts.
 */

/* ── FormSectionHeader (visual divider for long forms) ── */

export function FormSectionHeader({ title }: { title: string }) {
  return (
    <View style={detailStyles.formSectionHeader}>
      <View style={detailStyles.formSectionLine} />
      <Text style={detailStyles.formSectionText}>{title}</Text>
      <View style={detailStyles.formSectionLine} />
    </View>
  );
}

/* ── StatusBadge ───────────────────────────────────────── */

export function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[detailStyles.statusBadge, { backgroundColor: color }]}>
      <Text style={detailStyles.statusBadgeText}>{label}</Text>
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
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={[detailStyles.actionBtn, { backgroundColor: color }]} onPress={onPress}>
      <Text style={detailStyles.actionBtnText}>{label}</Text>
    </Pressable>
  );
}

/* ── SectionTitle ──────────────────────────────────────── */

export function SectionTitle({ title }: { title: string }) {
  return <Text style={detailStyles.sectionTitle}>{title}</Text>;
}

/* ── SaveButton / CancelButton ─────────────────────────── */

export function SaveButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Save changes" style={detailStyles.saveBtn} onPress={onPress}>
      <Text style={detailStyles.saveBtnText}>{label}</Text>
    </Pressable>
  );
}

export function CancelButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Cancel changes" style={detailStyles.cancelBtn} onPress={onPress}>
      <Text style={detailStyles.cancelBtnText}>Cancel</Text>
    </Pressable>
  );
}

export function DeleteButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Delete record" style={detailStyles.deleteBtn} onPress={onPress}>
      <Text style={detailStyles.deleteBtnText}>{label}</Text>
    </Pressable>
  );
}
