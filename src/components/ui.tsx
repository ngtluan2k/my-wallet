import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardShadow, radius, spacing, tint, useTheme, type ThemeColors } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type Tone =
  | 'default'
  | 'muted'
  | 'faint'
  | 'primary'
  | 'income'
  | 'expense'
  | 'transfer'
  | 'warning'
  | 'danger'
  | 'onPrimary'
  | 'onHero'
  | 'onHeroMuted';

function toneColor(colors: ThemeColors, tone: Tone): string {
  switch (tone) {
    case 'default':
      return colors.text;
    case 'muted':
      return colors.textMuted;
    case 'faint':
      return colors.textFaint;
    default:
      return colors[tone];
  }
}

export function AppText({
  tone = 'default',
  size = 15,
  weight,
  tabular,
  style,
  ...props
}: TextProps & { tone?: Tone; size?: number; weight?: '400' | '500' | '600' | '700'; tabular?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      style={[
        { color: toneColor(colors, tone), fontSize: size, fontWeight: weight },
        tabular && styles.tabular,
        style,
      ]}
    />
  );
}

/** Scrollable page body with the design's 16px gutters. Bottom padding clears the tab bar. */
export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  if (!scroll) {
    return <View style={[styles.flex, { backgroundColor: colors.background }, contentStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.screenContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

/** Title block at the top of a tab: small uppercase eyebrow, large title, optional right element. */
export function PageTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.pageTitle}>
      <View style={styles.flexShrink}>
        {eyebrow && (
          <AppText tone="primary" size={12} weight="600" style={styles.eyebrow}>
            {eyebrow}
          </AppText>
        )}
        <AppText size={28} weight="700" style={styles.tight}>
          {title}
        </AppText>
      </View>
      {right}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const base = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow(colors)];
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [base, pressed && styles.pressed, style]}>
      {children}
    </Pressable>
  );
}

/** Large emphasized card (balance, budget overview). */
export function HeroCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[styles.hero, { backgroundColor: colors.hero }, cardShadow(colors, 2), style]}>{children}</View>;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flexShrink}>
        <AppText size={20} weight="600">
          {title}
        </AppText>
        {subtitle && (
          <AppText tone="muted" size={13}>
            {subtitle}
          </AppText>
        )}
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" style={styles.row}>
          <AppText tone="primary" size={13} weight="600">
            {actionLabel}
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

/** Uppercase caption above grouped lists. */
export function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <AppText tone="muted" size={12} weight="600" style={styles.groupLabel}>
      {children}
    </AppText>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  compact,
}: {
  label: string;
  onPress(): void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const background = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.dangerSoft : colors.surfaceMuted;
  const foreground = variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.danger : colors.text;
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: background, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={foreground} />}
      <Text style={[styles.buttonLabel, compact && styles.buttonLabelCompact, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function IconCircle({ icon, color, size = 40 }: { icon: string; color: string; size?: number }) {
  return (
    <View style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint(color) }]}>
      <Ionicons name={icon as IconName} size={size * 0.5} color={color} />
    </View>
  );
}

/** Minimum 8px track with rounded caps, per the design system. */
export function ProgressBar({ ratio, color, height = 8 }: { ratio: number; color: string; height?: number }) {
  const { colors } = useTheme();
  const width = `${Math.min(Math.max(ratio, 0), 1) * 100}%` as const;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.fill, { width, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange(value: T): void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && [{ backgroundColor: colors.surface }, cardShadow(colors)]]}
          >
            {selected && option.color && <View style={[styles.dot, { backgroundColor: option.color }]} />}
            <Text
              numberOfLines={1}
              style={{
                color: selected ? (option.color ?? colors.primary) : colors.textMuted,
                fontSize: 14,
                fontWeight: selected ? '600' : '500',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress(): void;
  color?: string;
}) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? accent : colors.border,
          backgroundColor: selected ? tint(accent, 0.12) : colors.surface,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={{ color: selected ? accent : colors.text, fontSize: 14, fontWeight: selected ? '600' : '500' }}>{label}</Text>
    </Pressable>
  );
}

/** Small rounded label, e.g. budget status. */
export function Badge({ label, color, background }: { label: string; color: string; background: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.badgeText, { color }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Grouped list in a card, iOS settings style. Children are ListRows. */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={[styles.listGroup, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow(colors), style]}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          {child}
        </View>
      ))}
    </View>
  );
}

export function ListRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  accessory,
  destructive,
  chevron,
  onPress,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  accessory?: ReactNode;
  destructive?: boolean;
  chevron?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const accent = destructive ? colors.danger : (iconColor ?? colors.primary);
  const content = (
    <>
      {icon && (
        <View style={[styles.listIcon, { backgroundColor: tint(accent, 0.12) }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
      )}
      <View style={styles.flex}>
        <AppText weight="600" size={16} tone={destructive ? 'danger' : 'default'}>
          {title}
        </AppText>
        {subtitle && (
          <AppText size={13} tone="muted" style={styles.listSubtitle}>
            {subtitle}
          </AppText>
        )}
      </View>
      {value && (
        <AppText tone="muted" size={15} numberOfLines={1} style={styles.listValue}>
          {value}
        </AppText>
      )}
      {accessory}
      {chevron && <Ionicons name="chevron-forward" size={18} color={destructive ? colors.danger : colors.textFaint} />}
    </>
  );
  if (!onPress) return <View style={styles.listRow}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: colors.surfaceTint }]}
    >
      {content}
    </Pressable>
  );
}

export function Toggle({ value, onValueChange, disabled }: { value: boolean; onValueChange(v: boolean): void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ true: colors.primary, false: colors.surfaceMuted }}
      ios_backgroundColor={colors.surfaceMuted}
    />
  );
}

export function TextField({
  label,
  error,
  icon,
  right,
  ...props
}: TextInputProps & { label?: string; error?: string; icon?: IconName; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      {label && (
        <AppText weight="600" size={14}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.inputBox,
          { backgroundColor: colors.surfaceMuted, borderColor: error ? colors.danger : colors.border },
        ]}
      >
        {icon && <Ionicons name={icon} size={20} color={colors.textMuted} />}
        <TextInput
          placeholderTextColor={colors.textFaint}
          {...props}
          style={[styles.input, { color: colors.text }, props.style]}
        />
        {right}
      </View>
      {error && (
        <AppText tone="danger" size={13}>
          {error}
        </AppText>
      )}
    </View>
  );
}

export function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name={icon} size={28} color={colors.textMuted} />
      </View>
      <AppText tone="muted" style={styles.centerText}>
        {message}
      </AppText>
    </View>
  );
}

/** Bottom sheet over a dimmed backdrop. Tapping the backdrop closes it. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose(): void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.flex, { backgroundColor: colors.scrim }]} onPress={onClose} accessibilityLabel={title} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <View style={styles.sheetHeader}>
          <AppText size={18} weight="600">
            {title}
          </AppText>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
  tabular: { fontVariant: ['tabular-nums'] },
  tight: { letterSpacing: -0.3 },
  screenContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 120, gap: spacing.lg },
  pageTitle: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  eyebrow: { letterSpacing: 0.8, marginBottom: 2 },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.md },
  hero: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  groupLabel: { letterSpacing: 0.8, marginBottom: -spacing.sm, paddingHorizontal: spacing.xs },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: spacing.md },
  buttonLabel: { fontSize: 17, fontWeight: '600' },
  buttonLabelCompact: { fontSize: 15 },
  track: { overflow: 'hidden' },
  fill: { height: '100%' },
  segmented: { flexDirection: 'row', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 180 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  listGroup: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14, paddingHorizontal: spacing.md, minHeight: 56 },
  listIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  listSubtitle: { marginTop: 2 },
  listValue: { maxWidth: '45%' },
  field: { gap: spacing.sm },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '85%' },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: spacing.sm },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sheetBody: { flexGrow: 0 },
  sheetContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.md },
});
