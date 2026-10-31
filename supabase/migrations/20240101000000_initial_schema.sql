-- ============================================================================
-- Ví Mình (My Wallet) — Initial Schema
-- Tạo tất cả bảng cần thiết cho ứng dụng quản lý thu chi
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Bảng profiles — Thông tin người dùng bổ sung
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    language TEXT DEFAULT 'vi' CHECK (language IN ('vi', 'en', 'system')),
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    currency TEXT DEFAULT 'VND',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Bảng wallets — Ví tiền và số dư đầu kỳ
-- ---------------------------------------------------------------------------
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Ví chính',
    opening_balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'VND',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Bảng categories — Danh mục thu/chi
-- ---------------------------------------------------------------------------
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    built_in_key TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT category_name_or_key CHECK (
        (is_system = TRUE AND built_in_key IS NOT NULL AND name IS NULL) OR
        (is_system = FALSE AND name IS NOT NULL)
    )
);

-- ---------------------------------------------------------------------------
-- Bảng transactions — Giao dịch
-- ---------------------------------------------------------------------------
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Bảng budgets — Ngân sách theo kỳ và danh mục
-- ---------------------------------------------------------------------------
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL, -- YYYY-MM format
    limit_amount NUMERIC(18, 2) NOT NULL CHECK (limit_amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, category_id, month_key)
);

-- ---------------------------------------------------------------------------
-- Bảng savings_goals — Mục tiêu tiết kiệm (tùy chọn, có thể bổ sung sau)
-- ---------------------------------------------------------------------------
CREATE TABLE public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(18, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Bảng sync_queue — Hàng đợi đồng bộ (offline-first)
-- ---------------------------------------------------------------------------
CREATE TABLE public.sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_transactions_user_date ON public.transactions (user_id, transaction_date DESC);
CREATE INDEX idx_transactions_user_category ON public.transactions (user_id, category_id);
CREATE INDEX idx_transactions_user_type ON public.transactions (user_id, type);

CREATE INDEX idx_budgets_user_month ON public.budgets (user_id, month_key);
CREATE INDEX idx_budgets_user_category ON public.budgets (user_id, category_id);

CREATE INDEX idx_sync_queue_unsynced ON public.sync_queue (user_id, synced_at) WHERE synced_at IS NULL;

-- ---------------------------------------------------------------------------
-- Enable Row Level Security (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

-- Profiles
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete" ON public.profiles
    FOR DELETE TO authenticated USING (auth.uid() = id);

-- Wallets
CREATE POLICY "wallets_select" ON public.wallets
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wallets_insert" ON public.wallets
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallets_update" ON public.wallets
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallets_delete" ON public.wallets
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Categories: system categories readable by all authenticated users
CREATE POLICY "categories_select" ON public.categories
    FOR SELECT TO authenticated USING (is_system = TRUE OR auth.uid() = user_id);
CREATE POLICY "categories_insert" ON public.categories
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_system = FALSE);
CREATE POLICY "categories_update" ON public.categories
    FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_system = FALSE)
    WITH CHECK (auth.uid() = user_id AND is_system = FALSE);
CREATE POLICY "categories_delete" ON public.categories
    FOR DELETE TO authenticated USING (auth.uid() = user_id AND is_system = FALSE);

-- Transactions
CREATE POLICY "transactions_select" ON public.transactions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON public.transactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON public.transactions
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON public.transactions
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Budgets
CREATE POLICY "budgets_select" ON public.budgets
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert" ON public.budgets
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update" ON public.budgets
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_delete" ON public.budgets
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Savings goals
CREATE POLICY "savings_goals_select" ON public.savings_goals
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "savings_goals_insert" ON public.savings_goals
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals_update" ON public.savings_goals
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals_delete" ON public.savings_goals
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sync queue
CREATE POLICY "sync_queue_select" ON public.sync_queue
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sync_queue_insert" ON public.sync_queue
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sync_queue_update" ON public.sync_queue
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sync_queue_delete" ON public.sync_queue
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on every row update
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_wallets BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_transactions BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_budgets BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_savings_goals BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: Auto-create profile + default wallet + default categories on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );

    INSERT INTO public.wallets (user_id, name, is_default)
    VALUES (NEW.id, 'Ví chính', TRUE);

    INSERT INTO public.categories (user_id, built_in_key, type, icon, color, is_system)
    VALUES
        (NEW.id, 'food', 'expense', 'restaurant', '#F97316', TRUE),
        (NEW.id, 'transport', 'expense', 'car', '#0EA5E9', TRUE),
        (NEW.id, 'shopping', 'expense', 'bag-handle', '#EC4899', TRUE),
        (NEW.id, 'bills', 'expense', 'receipt', '#8B5CF6', TRUE),
        (NEW.id, 'housing', 'expense', 'home', '#14B8A6', TRUE),
        (NEW.id, 'health', 'expense', 'medkit', '#EF4444', TRUE),
        (NEW.id, 'education', 'expense', 'school', '#6366F1', TRUE),
        (NEW.id, 'entertainment', 'expense', 'game-controller', '#EAB308', TRUE),
        (NEW.id, 'otherExpense', 'expense', 'ellipsis-horizontal', '#64748B', TRUE),
        (NEW.id, 'salary', 'income', 'briefcase', '#16A34A', TRUE),
        (NEW.id, 'bonus', 'income', 'gift', '#22C55E', TRUE),
        (NEW.id, 'investment', 'income', 'trending-up', '#059669', TRUE),
        (NEW.id, 'otherIncome', 'income', 'ellipsis-horizontal', '#64748B', TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Grant access to authenticated role
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;