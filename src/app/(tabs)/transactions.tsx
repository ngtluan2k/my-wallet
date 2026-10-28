import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { MonthSwitcher, SummaryCard, TransactionRow, useCategories } from '@/components/wallet';
import { AppText, Chip, Fab, Segmented } from '@/components/ui';
import { filterTransactions, sortTransactions, summarize } from '@/domain/transactions';
import type { TransactionType } from '@/domain/types';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useTransactions } from '@/state/wallet';
import { radius, spacing, useTheme } from '@/theme';

type TypeFilter = 'all' | TransactionType;

export default function TransactionsScreen() {
  const { t, categoryName } = useT();
  const { colors } = useTheme();
  const month = useSelectedMonth((s) => s.month);
  const transactions = useTransactions();
  const categories = useCategories();

  const [type, setType] = useState<TypeFilter>('all');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [search, setSearch] = useState('');

  const visibleCategories = useMemo(
    () => [...categories.values()].filter((c) => type === 'all' || c.type === type),
    [categories, type],
  );
  const filtered = useMemo(
    () =>
      sortTransactions(
        filterTransactions(transactions, { month, type: type === 'all' ? undefined : type, categoryId, search }),
      ),
    [transactions, month, type, categoryId, search],
  );
  const summary = useMemo(() => summarize(filtered), [filtered]);

  function changeType(next: TypeFilter) {
    setType(next);
    if (categoryId && next !== 'all' && categories.get(categoryId)?.type !== next) setCategoryId(undefined);
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <MonthSwitcher />
            <Segmented<TypeFilter>
              value={type}
              onChange={changeType}
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'expense', label: t('type.expense') },
                { value: 'income', label: t('type.income') },
              ]}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label={t('common.all')} selected={!categoryId} onPress={() => setCategoryId(undefined)} />
              {visibleCategories.map((c) => (
                <Chip
                  key={c.id}
                  label={categoryName(c)}
                  color={c.color}
                  selected={categoryId === c.id}
                  onPress={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
                />
              ))}
            </ScrollView>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('transactions.search')}
              placeholderTextColor={colors.textMuted}
              clearButtonMode="while-editing"
              style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            />
            <SummaryCard summary={summary} />
          </View>
        }
        ListEmptyComponent={
          <AppText tone="muted" style={styles.empty}>
            {t('transactions.empty')}
          </AppText>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.surface }]}>
            <TransactionRow
              transaction={item}
              category={categories.get(item.categoryId)}
              onPress={() => router.push({ pathname: '/transaction', params: { id: item.id } })}
            />
          </View>
        )}
      />
      <Fab label={t('transactions.add')} onPress={() => router.push('/transaction')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 96, gap: spacing.sm },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  chips: { gap: spacing.sm },
  search: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15 },
  row: { borderRadius: radius.md, paddingHorizontal: spacing.md },
  empty: { textAlign: 'center', marginTop: spacing.xl },
});
