import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Badge, Button, IconCircle, ListGroup, Screen, SegmentedControl } from '@/components/ui';
import { useCategories } from '@/components/wallet';
import type { Category, CategoryType } from '@/domain/types';
import { useT } from '@/i18n';
import { useTransactions } from '@/state/wallet';
import { spacing, useTheme } from '@/theme';

/** Built-in categories are read-only; user categories open the editor. */
export default function CategoriesScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const [type, setType] = useState<CategoryType>('expense');
  const categories = useCategories();
  const transactions = useTransactions();
  const list = useMemo(() => [...categories.values()].filter((c) => c.type === type), [categories, type]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) if (tx.categoryId) map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + 1);
    return map;
  }, [transactions]);

  const add = () => router.push({ pathname: '/category-edit', params: { type } });

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={add} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('categories.add')}>
              <Ionicons name="add" size={28} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        <SegmentedControl<CategoryType>
          value={type}
          onChange={setType}
          options={[
            { value: 'expense', label: t('type.short.expense') },
            { value: 'income', label: t('type.short.income') },
          ]}
        />
        <ListGroup>
          {list.map((c) => (
            <CategoryRow key={c.id} category={c} count={counts.get(c.id) ?? 0} />
          ))}
        </ListGroup>
        <AppText tone="muted" size={13}>
          {t('categories.builtInHint')}
        </AppText>
        <Button variant="secondary" icon="add" label={t('categories.add')} onPress={add} />
      </Screen>
    </>
  );
}

function CategoryRow({ category, count }: { category: Category; count: number }) {
  const { t, categoryName } = useT();
  const { colors } = useTheme();
  const builtIn = !!category.builtInKey;
  const content = (
    <>
      <IconCircle icon={category.icon} color={category.color} />
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <AppText weight="600" size={16} numberOfLines={1} style={styles.shrink}>
            {categoryName(category)}
          </AppText>
          {builtIn && <Badge label={t('categories.builtIn')} color={colors.textMuted} background={colors.surfaceMuted} />}
        </View>
        <AppText tone="muted" size={13}>
          {t('categories.count', { count })}
        </AppText>
      </View>
      {!builtIn && <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
    </>
  );
  if (builtIn) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/category-edit', params: { id: category.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceTint }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
