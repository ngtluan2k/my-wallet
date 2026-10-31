# Supabase Database Setup

## Bảng tóm tắt

Dự án My Wallet sử dụng Supabase PostgreSQL với Row Level Security (RLS) để đảm bảo mỗi người dùng chỉ có thể truy cập dữ liệu của họ.

## Database Schema

### Bảng chính

| Bảng | Mục đích | RLS |
|------|----------|-----|
| `profiles` | Thông tin người dùng bổ sung | ✅ Có |
| `wallets` | Ví tiền và số dư đầu kỳ | ✅ Có |
| `categories` | Danh mục thu/chi (system + user-defined) | ✅ Có |
| `transactions` | Giao dịch tài chính | ✅ Có |
| `budgets` | Ngân sách theo kỳ và danh mục | ✅ Có |
| `savings_goals` | Mục tiêu tiết kiệm | ✅ Có |
| `sync_queue` | Hàng đợi đồng bộ offline-first | ✅ Có |

## Các đặc điểm chính

### 1. Xác thực người dùng

```sql
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
```

### 2. Ví tiền đa dạng

```sql
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
```

### 3. Danh mục thu/chi

```sql
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4. Giao dịch tài chính

```sql
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
```

### 5. Ngân sách hàng tháng

```sql
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
```

### 6. Mục tiêu tiết kiệm

```sql
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
```

### 7. Đồng bộ offline

```sql
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
```

## Row Level Security (RLS)

Tất cả bảng đều được bảo vệ bởi RLS, đảm bảo mỗi người dùng chỉ có thể truy cập dữ liệu của họ:

```sql
-- Ví dụ: Chính sách giao dịch
CREATE POLICY "transactions_select" ON public.transactions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert" ON public.transactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update" ON public.transactions
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_delete" ON public.transactions
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

## Triggers

### Trigger cập nhật thời gian tự động

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- Tương tự cho tất cả các bảng khác...
```

### Trigger tạo profile tự động khi đăng ký

```sql
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

    -- Chèn 13 danh mục mặc định...
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Indexes

```sql
CREATE INDEX idx_transactions_user_date ON public.transactions (user_id, transaction_date DESC);
CREATE INDEX idx_transactions_user_category ON public.transactions (user_id, category_id);
CREATE INDEX idx_transactions_user_type ON public.transactions (user_id, type);

CREATE INDEX idx_budgets_user_month ON public.budgets (user_id, month_key);
CREATE INDEX idx_budgets_user_category ON public.budgets (user_id, category_id);

CREATE INDEX idx_sync_queue_unsynced ON public.sync_queue (user_id, synced_at) WHERE synced_at IS NULL;
```

## Grants

```sql
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

## Cách sử dụng

### 1. Khởi tạo Supabase

1. Đăng nhập vào Supabase dashboard
2. Tạo dự án mới
3. Chọn "Start from scratch"
4. Chọn "Use an existing domain"

### 2. Tạo database

Sao chép toàn bộ SQL từ file `supabase/migrations/20240101000000_initial_schema.sql`

### 3. Cấu hình môi trường

Thêm các biến môi trường:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-publishable-key
```

### 4. Xác thực kết nối

Trong `src/data/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

### 5. Khởi động ứng dụng

```bash
npx expo start
```

### 6. Đăng ký và đăng nhập

Ứng dụng sẽ tự động tạo profile, ví mặc định và danh mục khi người dùng đăng ký lần đầu.

## Khắc phục sự cố

### Lỗi RLS

Nếu bạn gặp lỗi "not authorized", hãy kiểm tra:
- Người dùng đã đăng nhập chưa
- Chính sách RLS đúng cho bảng
- `auth.uid()` so sánh với `user_id` trong bảng

### Lỗi index không tìm thấy

Nếu gặp lỗi index, hãy:
1. Kiểm tra tên index chính xác
2. Xác nhận việc tạo index trong Supabase SQL editor
3. Truy cập lại database

### Đồng bộ offline

Để kiểm tra đồng bộ:
1. Truy cập Supabase dashboard
2. Mở `sync_queue` table
3. Kiểm tra các hàng chưa được đồng bộ (`synced_at IS NULL`)

## Tện mãi

Dự án có sẵn cấu hình hoàn chỉnh cho:
- ✅ Xác thực người dùng
- ✅ Đồng bộ offline
- ✅ Bảo mật dữ liệu
- ✅ Tự động tạo dữ liệu người dùng
- ✅ Index được tối ưu hóa

Bạn có thể bắt đầu phát triển ngay lập tức sau khi thiết lập Supabase! 🚀