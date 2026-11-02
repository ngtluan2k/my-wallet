import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, IconCircle, SegmentedControl, TextField, type IconName } from '@/components/ui';
import { useCategories } from '@/components/wallet';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryInUse,
  MAX_CATEGORY_NAME_LENGTH,
  type CategoryError,
} from '@/domain/categories';
import type { CategoryType } from '@/domain/types';
import { useT } from '@/i18n';
import { useTransactions, walletStore } from '@/state/wallet';
import { ValidationError } from '@/state/walletStore';
import { spacing, tint, useTheme } from '@/theme';

/** Add (`?type=`) or edit (`?id=`) a user category. Built-in categories never reach this screen. */
export default function CategoryEditScreen() {
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const { t, categoryName } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const transactions = useTransactions();
  const existing = params.id ? categories.get(params.id) : undefined;

  const [type, setType] = useState<CategoryType>(existing?.type ?? (params.type === 'income' ? 'income' : 'expense'));
  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? CATEGORY_ICONS[0]);
  const [color, setColor] = useState(existing?.color ?? CATEGORY_COLORS[0]);
  const [error, setError] = useState<CategoryError | null>(null);

  const inUse = existing ? categoryInUse(transactions, existing.id) : false;
  const takenNames = useMemo(
    () => [...categories.values()].filter((c) => c.type === type && c.id !== existing?.id).map((c) => categoryName(c)),
    [categories, type, existing, categoryName],
  );

  async function save() {
    try {
      if (existing) await walletStore.getState().editCategory(existing.id, { name, icon, color }, takenNames);
      else await walletStore.getState().addCategory({ name, type, icon, color }, takenNames);
      router.back();
    } catch (e) {
      if (e instanceof ValidationError) setError((e.errors as CategoryError[])[0]);
      else Alert.alert(t('common.error'), t('storage.saveFailed'));
    }
  }

  function remove() {
    if (!existing) return;
    Alert.alert(t('categories.delete'), t('categories.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          walletStore
            .getState()
            .deleteCategory(existing.id)
            .then(() => router.back())
            .catch((e: unknown) =>
              Alert.alert(
                t('common.error'),
                e instanceof Error && e.message === 'category_in_use' ? t('categories.inUse') : t('storage.saveFailed'),
              ),
            ),
      },
    ]);
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <AppText size={17} tone="muted">
            {t('common.cancel')}
          </AppText>
        </Pressable>
        <AppText size={18} weight="600">
          {existing ? t('categories.edit') : t('categories.add')}
        </AppText>
        <Pressable onPress={save} hitSlop={12} accessibilityRole="button">
          <AppText size={17} tone="primary" weight="600">
            {t('common.save')}
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]} keyboardShouldPersistTaps="handled">
        <View style={styles.preview}>
          <IconCircle icon={icon} color={color} size={64} />
          <AppText size={17} weight="600">
            {name.trim() || t('categories.namePlaceholder')}
          </AppText>
        </View>

        {!existing && (
          <SegmentedControl<CategoryType>
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: t('type.short.expense') },
              { value: 'income', label: t('type.short.income') },
            ]}
          />
        )}

        <TextField
          label={t('categories.name')}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          placeholder={t('categories.namePlaceholder')}
          maxLength={MAX_CATEGORY_NAME_LENGTH + 5}
          error={error ? t(`categories.error.${error}`) : undefined}
        />

        <View style={styles.field}>
          <AppText weight="600" size={14}>
            {t('categories.icon')}
          </AppText>
          <View style={styles.grid}>
            {CATEGORY_ICONS.map((glyph) => {
              const selected = glyph === icon;
              return (
                <Pressable
                  key={glyph}
                  onPress={() => setIcon(glyph)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={glyph}
                  style={[
                    styles.iconOption,
                    { borderColor: selected ? color : colors.border, backgroundColor: selected ? tint(color, 0.12) : colors.surface },
                  ]}
                >
                  <Ionicons name={glyph as IconName} size={22} color={selected ? color : colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText weight="600" size={14}>
            {t('categories.color')}
          </AppText>
          <View style={styles.grid}>
            {CATEGORY_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityRole="radio"
                accessibilityState={{ selected: c === color }}
                accessibilityLabel={c}
                style={[styles.swatch, { backgroundColor: c, borderColor: c === color ? colors.text : 'transparent' }]}
              >
                {c === color && <Ionicons name="checkmark" size={18} color={colors.onHero} />}
              </Pressable>
            ))}
          </View>
        </View>

        {existing &&
          (inUse ? (
            <AppText tone="muted" size={13}>
              {t('categories.inUse')}
            </AppText>
          ) : (
            <Button variant="danger" icon="trash-outline" label={t('categories.delete')} onPress={remove} />
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.lg },
  preview: { alignItems: 'center', gap: spacing.sm },
  field: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconOption: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});
