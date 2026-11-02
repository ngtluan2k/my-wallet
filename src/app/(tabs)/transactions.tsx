import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { TabPage } from '@/components/AppHeader';
import { AppText, Card, Chip, EmptyState, PageTitle, SegmentedControl, Sheet, Button } from '@/components/ui';
import { DayHeader, MonthSwitcher, TransactionRow, useCategories, useWalletMap } from '@/components/wallet';
import { filterTransactions, groupByDay, searchTransactions, summarize } from '@/domain/transactions';
import type { TransactionType } from '@/domain/types';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useTransactions } from '@/state/wallet';
import { radius, spacing, useTheme } from '@/theme';

type TypeFilter = 'all' | TransactionType;

export default function TransactionsScreen() {
  const { t, categoryName, signedMoney } = useT();
  const { colors } = useTheme();
  const month = useSelectedMonth((s) => s.month);
  const transactions = useTransactions();
  const categories = useCategories();
  const wallets = useWalletMap();

  const [type, setType] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [walletId, setWalletId] = useState<string | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);

  const monthTxs = useMemo(() => filterTransactions(transactions, { month }), [transactions, month]);
  const summary = useMemo(() => summarize(monthTxs), [monthTxs]);
  const sections = useMemo(() => {
    const filtered = filterTransactions(monthTxs, {
      type: type === 'all' ? undefined : type,
      categoryId,
      walletId,
    });
    const found = searchTransactions(filtered, query, (id) => (id ? categoryName(categories.get(id)) : t('type.transfer')));
    return groupByDay(found).map((g) => ({ key: g.date, date: g.date, net: g.net, data: g.transactions }));
  }, [monthTxs, type, categoryId, walletId, query, categoryName, categories, t]);

  const activeFilters = (categoryId ? 1 : 0) + (walletId ? 1 : 0);
  const filtering = activeFilters > 0 || query.trim() !== '' || type !== 'all';

  const header = (
    <View style={styles.header}>
      <PageTitle
        eyebrow={t('transactions.eyebrow')}
        title={t('transactions.title')}
        right={
          <Pressable
            onPress={() => setFilterOpen(true)}
            accessibilityRole="button"
            style={[styles.filterButton, { borderColor: activeFilters ? colors.primary : colors.border, backgroundColor: colors.surface }]}
          >
            <Ionicons name="filter" size={16} color={activeFilters ? colors.primary : colors.text} />
            <AppText size={14} weight="600" tone={activeFilters ? 'primary' : 'default'}>
              {t('transactions.filter')}
              {activeFilters ? ` (${activeFilters})` : ''}
            </AppText>
          </Pressable>
        }
      />

      <Card>
        <MonthSwitcher />
        <SegmentedControl<TypeFilter>
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'expense', label: t('type.short.expense') },
            { value: 'income', label: t('type.short.income') },
            { value: 'transfer', label: t('type.short.transfer') },
          ]}
        />
      </Card>

      <Card>
        <View style={styles.between}>
          <AppText tone="muted" weight="500">
            {t('transactions.netFlow')}
          </AppText>
          <AppText size={20} weight="700" tabular tone={summary.difference < 0 ? 'expense' : 'income'}>
            {signedMoney(summary.difference)}
          </AppText>
        </View>
        <View style={styles.row}>
          <FlowTile label={t('summary.income')} value={signedMoney(summary.income)} tone="income" icon="arrow-down" />
          <FlowTile label={t('summary.expense')} value={signedMoney(-summary.expense)} tone="expense" icon="arrow-up" />
        </View>
      </Card>

      <View style={[styles.search, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('transactions.search')}
          placeholderTextColor={colors.textFaint}
          style={[styles.searchInput, { color: colors.text }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );

  return (
    <TabPage>
      <SectionList
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => <DayHeader date={section.date} net={section.net} />}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.item,
              { backgroundColor: colors.surface, borderColor: colors.border },
              index === 0 && styles.itemFirst,
              index === section.data.length - 1 && styles.itemLast,
              index > 0 && { borderTopWidth: 0 },
            ]}
          >
            {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            <TransactionRow
              transaction={item}
              categories={categories}
              wallets={wallets}
              onPress={() => router.push({ pathname: '/transaction', params: { id: item.id } })}
            />
          </View>
        )}
        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" message={filtering ? t('transactions.emptySearch') : t('transactions.empty')} />
        }
      />

      <Sheet visible={filterOpen} title={t('transactions.filterTitle')} onClose={() => setFilterOpen(false)}>
        <AppText weight="600">{t('transactions.filterWallet')}</AppText>
        <View style={styles.chips}>
          <Chip label={t('common.all')} selected={!walletId} onPress={() => setWalletId(undefined)} />
          {[...wallets.values()].map((w) => (
            <Chip key={w.id} label={w.name} color={w.color} selected={walletId === w.id} onPress={() => setWalletId(w.id)} />
          ))}
        </View>
        <AppText weight="600">{t('transactions.filterCategory')}</AppText>
        <View style={styles.chips}>
          <Chip label={t('common.all')} selected={!categoryId} onPress={() => setCategoryId(undefined)} />
          {[...categories.values()]
            .filter((c) => type === 'all' || c.type === type)
            .map((c) => (
              <Chip key={c.id} label={categoryName(c)} color={c.color} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
        </View>
        {activeFilters > 0 && (
          <Button
            variant="secondary"
            label={t('transactions.filterClear')}
            onPress={() => {
              setCategoryId(undefined);
              setWalletId(undefined);
            }}
          />
        )}
      </Sheet>
    </TabPage>
  );
}

function FlowTile({ label, value, tone, icon }: { label: string; value: string; tone: 'income' | 'expense'; icon: 'arrow-down' | 'arrow-up' }) {
  const { colors } = useTheme();
  const color = tone === 'income' ? colors.income : colors.expense;
  return (
    <View style={[styles.flowTile, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.flowIcon, { backgroundColor: tone === 'income' ? colors.incomeSoft : colors.expenseSoft }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.flex}>
        <AppText tone="muted" size={13}>
          {label}
        </AppText>
        <AppText tone={tone} weight="700" size={16} tabular adjustsFontSizeToFit numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 120 },
  header: { gap: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  flowTile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md },
  flowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 14 },
  item: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  itemFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, marginTop: spacing.sm },
  itemLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
  sectionGap: { height: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
