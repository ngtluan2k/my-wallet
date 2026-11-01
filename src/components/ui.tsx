import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextProps, type ViewStyle } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  if (!scroll) return <View style={[styles.screen, { backgroundColor: colors.background }]}>{children}</View>;
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: radius.lg,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -2 },
        elevation: 4
      }, 
      style
    ]}>{children}</View>
  );
}

export function ModernCard({ 
  children, 
  elevated = false, 
  glassmorphic = false,
  style 
}: { 
  children: ReactNode; 
  elevated?: boolean; 
  glassmorphic?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  
  const getShadowLevel = () => {
    if (elevated) return shadows.level3;
    if (glassmorphic) return shadows.level1;
    return shadows.level0;
  };
  
  return (
    <View
      style={[
        styles.card,
        {
          // Modern card styling
          backgroundColor: glassmorphic ? 'rgba(255, 255, 255, 0.8)' : colors.surface,
          borderColor: colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg, // 18px
          ...getShadowLevel(),
          // Micro-interactions
          ...(glassmorphic && {
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 32,
            shadowOffset: { width: 0, height: 8 },
          }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type Tone = 'default' | 'muted' | 'income' | 'expense' | 'warning' | 'danger' | 'primary';

export function AppText({
  tone = 'default',
  size,
  weight,
  style,
  ...props
}: TextProps & { tone?: Tone; size?: number; weight?: '400' | '500' | '600' | '700' }) {
  const { colors } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    income: colors.income,
    expense: colors.expense,
    warning: colors.warning,
    danger: colors.danger,
    primary: colors.primary,
  }[tone];
  
  return <Text {...props} style={[{ color, fontSize: size, fontWeight: weight }, style]} />;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <AppText size={13} weight="600" tone="muted" style={styles.sectionTitle}>
      {children}
    </AppText>
  );
}

export function CategoryIcon({ icon, color, size = 36 }: { icon: string; color: string; size?: number }) {
  return (
    <View style={[styles.icon, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}22` }]}>
      <Ionicons name={icon as IconName} size={size * 0.5} color={color} />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange(value: T): void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
      {options.map((o, index) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && { backgroundColor: colors.surface }]}
          >
            <AppText weight={selected ? "600" : "400"} tone={selected ? "default" : "muted"}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ModernSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange(value: T): void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.modernSegmentedContainer}>
      <View style={styles.modernSegmentedTrack}>
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.modernSegmentButton, selected && [styles.modernSegmentSelected, index === 0 && styles.modernSegmentFirst, index === options.length - 1 && styles.modernSegmentLast], index === 0 && styles.modernSegmentFirst, index === options.length - 1 && styles.modernSegmentLast]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <AppText
                weight={selected ? "600" : "400"}
                tone={selected ? "default" : "muted"}
                style={styles.modernSegmentText}
              >
                {option.label}
              </AppText>
              {selected && (
                <View style={styles.modernSegmentIndicator} />
              )}
            </Pressable>
          );
        })}
      </View>
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
      style={[
        styles.chip,
        { borderColor: selected ? accent : colors.border, backgroundColor: selected ? `${accent}22` : colors.surface },
      ]}
    >
      <AppText size={14} weight={selected ? '600' : '400'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
}: {
  label: string;
  onPress(): void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const background = variant === 'primary' ? colors.primary : colors.surfaceMuted;
  const foreground = variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button, 
        { 
          backgroundColor: background, 
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          borderRadius: radius.md,
          borderWidth: variant === 'primary' ? 0 : 1,
          borderColor: variant === 'primary' ? 'transparent' : colors.border,
        }
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={foreground} />}
      <Text style={{ color: foreground, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ ratio, color }: { ratio: number; color: string }) {
  const { colors } = useTheme();
  const width = `${Math.min(Math.max(ratio, 0), 1) * 100}%` as const;
  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.fill, { width, backgroundColor: color }]} />
    </View>
  );
}

export function Fab({ onPress, label }: { onPress(): void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
    >
      <Ionicons name="add" size={30} color={colors.onPrimary} />
    </Pressable>
  );
}

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
};

export function Skeleton({ width = 100, height = 12, borderRadius = 4, style }: SkeletonProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor: colors.surfaceMuted },
        style,
      ]}
    />
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceMuted }]}>{icon}</View>
      <AppText weight="600" size={18} style={styles.emptyTitle}>
        {title}
      </AppText>
      {subtitle && <AppText tone="muted" size={14} style={styles.emptySubtitle}>{subtitle}</AppText>}
      {actionLabel && onPress && (
        <Button label={actionLabel} variant="secondary" onPress={onPress} />
      )}
    </View>
  );
}

const shadows = {
  level0: {
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  level1: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  level2: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  level3: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenContent: { padding: spacing.lg, gap: spacing.xl, paddingBottom: 96 },
  card: { 
    borderRadius: radius.lg, 
    borderWidth: StyleSheet.hairlineWidth, 
    padding: spacing.lg, 
    gap: spacing.md,
    backgroundColor: 'transparent', 
  },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  icon: { alignItems: 'center', justifyContent: 'center' },
  segmented: { 
    flexDirection: 'row', 
    borderRadius: radius.md, 
    padding: 3,
    backgroundColor: 'transparent',
  },
  segment: { 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: spacing.sm, 
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
  },
  modernSegmentedContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: radius.md,
    padding: 3,
  },
  modernSegmentedTrack: {
    flexDirection: 'row',
  },
  modernSegmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    position: 'relative',
  },
  modernSegmentSelected: {
    backgroundColor: '#ffffff',
  },
  modernSegmentFirst: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  modernSegmentLast: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  modernSegmentText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modernSegmentIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -8 }],
    width: 16,
    height: 3,
    backgroundColor: '#006948',
    borderRadius: 2,
  },
  chip: { 
    paddingHorizontal: spacing.md, 
    paddingVertical: 6, 
    borderRadius: radius.pill, 
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modernChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modernChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modernChipIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  track: { 
    height: 8, 
    borderRadius: 4, 
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  fill: { height: '100%', borderRadius: 4 },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { textAlign: 'center' },
  emptySubtitle: { textAlign: 'center', marginTop: spacing.sm },
});
