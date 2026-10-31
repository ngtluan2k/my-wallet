# Ví Mình (My Wallet) — Kế hoạch phát triển ứng dụng

## 1. Tổng quan

- **Tên tiếng Việt:** Ví Mình
- **Tên tiếng Anh:** My Wallet
- **Slogan tiếng Việt:** Hiểu dòng tiền, sống chủ động.
- **Slogan tiếng Anh:** Understand your money. Take control of your life.
- **Mục tiêu:** Ứng dụng quản lý thu chi cá nhân, ngân sách và dòng tiền.
- **Nền tảng:** Multiplatform, ưu tiên iOS trước.
- **Công nghệ đã chọn:** React Native + Expo + TypeScript + Supabase + PostgreSQL.

## 2. Định hướng sản phẩm

1. Phát triển iOS trước, giữ khả năng mở rộng Android và Web.
2. Lưu dữ liệu chính trên Supabase PostgreSQL.
3. Dùng Supabase Auth cho xác thực người dùng.
4. Dùng Row Level Security (RLS) để mỗi người dùng chỉ truy cập dữ liệu của mình.
5. Tách UI, nghiệp vụ và tầng truy cập dữ liệu bằng Repository.
6. Có thể bổ sung offline-first bằng local storage, hàng đợi đồng bộ và xử lý xung đột.
7. Bảo vệ dữ liệu tài chính, hỗ trợ xuất dữ liệu và quy trình xóa tài khoản/dữ liệu.

**Bảo mật:** Ứng dụng client chỉ được dùng publishable key. Tuyệt đối không đưa `service_role` key hoặc bí mật server vào mã nguồn/bundle iOS.

## 3. Kiến trúc đề xuất

```text
iOS (giai đoạn đầu) / Android / Web (mở rộng)
                    |
        React Native + Expo + TypeScript
                    |
        UI / State Management / Services
                    |
             Repository Layer
                    |
        Supabase Client + Supabase Auth
                    |
       PostgreSQL + Row Level Security
                    |
        Optional local storage + sync queue
```

- UI không truy cập trực tiếp database; mọi thao tác đi qua repository/service.
- Nghiệp vụ tính toán thu chi không phụ thuộc nhà cung cấp backend.
- Supabase xử lý lưu trữ online và xác thực; offline-first cần được triển khai riêng.
- Dùng migration để quản lý thay đổi schema.
- Kiểm thử RLS với nhiều tài khoản khác nhau, bao gồm SELECT, INSERT, UPDATE và DELETE.

## 4. Công nghệ

| Thành phần | Công nghệ | Mục đích |
|---|---|---|
| Framework | React Native + Expo | Phát triển đa nền tảng |
| Ngôn ngữ | TypeScript | Kiểu dữ liệu tĩnh |
| Điều hướng | Expo Router | Điều hướng theo cấu trúc file |
| UI | Design system tùy biến | Giao diện sáng/tối và thương hiệu |
| Quản lý trạng thái | Zustand hoặc giải pháp tương đương | Quản lý state |
| Backend as a Service | Supabase | Auth, API và dịch vụ backend |
| Database | PostgreSQL trên Supabase | Dữ liệu nghiệp vụ |
| Phân quyền | PostgreSQL RLS | Cô lập dữ liệu theo người dùng |
| Cài đặt | AsyncStorage | Ngôn ngữ, giao diện và tùy chọn |
| Offline (nếu chọn) | Local storage phù hợp Expo | Ghi khi mất mạng và đồng bộ sau đó |
| Khóa ứng dụng | expo-local-authentication | Face ID / xác thực sinh trắc học |
| Kiểm thử | Jest (jest-expo) + React Native Testing Library | Kiểm thử nghiệp vụ và UI |

Các thư viện cụ thể cần được kiểm tra khả năng tương thích với phiên bản Expo/React Native tại thời điểm triển khai.

## 5. Kế hoạch phát triển dự kiến

Thời gian khoảng 5 tuần là ước tính ban đầu; offline-first và kiểm thử bảo mật có thể cần thêm thời gian.

### Giai đoạn 1 — Nền tảng, Supabase và giao diện (Tuần 1)

- Tạo dự án React Native + Expo + TypeScript.
- Tạo Supabase project và môi trường development/production.
- Thiết kế schema PostgreSQL và migration.
- Thiết lập Supabase Auth và chính sách RLS cơ bản.
- Xây dựng design system, điều hướng và màn hình chính.

### Giai đoạn 2 — Xác thực và giao dịch (Tuần 2)

- Tích hợp đăng ký/đăng nhập theo phương thức đã chốt.
- Thêm, sửa và xóa giao dịch thu/chi.
- Lưu số tiền, loại giao dịch, danh mục, ngày và ghi chú.
- Lọc theo ngày, tháng, danh mục và loại giao dịch.
- Tính tổng thu, tổng chi và chênh lệch thu chi.

### Giai đoạn 3 — Dashboard và ngân sách (Tuần 3)

- Tổng quan tài chính theo tháng.
- Biểu đồ thu chi và cơ cấu chi tiêu.
- Ngân sách theo danh mục.
- Cảnh báo gần hoặc vượt ngân sách.

### Giai đoạn 4 — Bảo mật, sao lưu và đồng bộ (Tuần 4)

- Kiểm thử RLS để ngăn truy cập chéo giữa các tài khoản.
- Xây dựng xuất dữ liệu và quy trình nhập/khôi phục an toàn.
- Nếu chọn offline-first: bổ sung local storage, hàng đợi đồng bộ và xử lý xung đột.
- Xử lý lỗi mạng, phiên đăng nhập hết hạn và lỗi đồng bộ.
- Có thể bổ sung khóa ứng dụng bằng Face ID.

### Giai đoạn 5 — Kiểm thử và phát hành iOS (Tuần 5)

- Kiểm thử giao dịch, báo cáo và phân quyền.
- Kiểm tra các kích thước màn hình iPhone.
- Kiểm thử mất mạng/khôi phục kết nối nếu có offline-first.
- Chuẩn bị icon, ảnh chụp màn hình và thông tin App Store.

## 6. Phạm vi MVP 1.0

### Dashboard
- Tổng thu, tổng chi và chênh lệch thu chi theo tháng.
- Biểu đồ cơ cấu chi tiêu.

### Giao dịch
- Thêm, sửa, xóa giao dịch thu/chi.
- Danh mục, ghi chú, ngày giao dịch.
- Tìm kiếm, lọc và lịch sử giao dịch.

### Ngân sách
- Ngân sách theo tháng và danh mục.
- Theo dõi mức sử dụng ngân sách.

### Tài khoản và cài đặt
- Đăng ký/đăng nhập qua Supabase Auth.
- Tiếng Việt và tiếng Anh.
- Giao diện sáng/tối.
- Đăng xuất và xử lý phiên hết hạn.
- Xuất dữ liệu sao lưu.
- Khóa ứng dụng tùy chọn.

### Chưa triển khai trong MVP
- Liên kết ngân hàng.
- Phân tích bằng AI.
- Hệ thống quản trị riêng.
- Chia sẻ tài chính giữa nhiều người dùng.
- Tự động đồng bộ offline phức tạp nếu chưa được chọn trong phạm vi.

## 7. Thiết kế database sơ bộ

### 7.1. Bảng dự kiến

| Bảng | Mục đích |
|---|---|
| `profiles` | Thông tin người dùng bổ sung |
| `wallets` | Ví tiền và số dư đầu kỳ |
| `categories` | Danh mục thu/chi |
| `transactions` | Giao dịch |
| `budgets` | Ngân sách theo kỳ và danh mục |
| `savings_goals` | Mục tiêu tiết kiệm, có thể bổ sung sau |

Mỗi bảng nghiệp vụ chứa dữ liệu cá nhân cần có `user_id` hoặc quan hệ sở hữu tương đương, cùng chính sách RLS phù hợp. Bảng `profiles` nên tham chiếu đến người dùng Supabase Auth.

### 7.2. Ví dụ schema khởi đầu cho transactions

Đây là ví dụ ban đầu, chưa phải migration hoàn chỉnh. Cần bổ sung khóa ngoại, RLS và trigger cập nhật `updated_at` trước khi phát hành.

```sql
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID,
    category_id UUID,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_date
    ON public.transactions (user_id, transaction_date DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

> Lưu ý: schema cần được hoàn thiện cùng các bảng `wallets`, `categories`, `budgets`, khóa ngoại, index và migration trước khi dùng thực tế. Không coi đoạn SQL trên là schema production đầy đủ.

## 8. Quy tắc nghiệp vụ

- Tổng thu = tổng giao dịch `income` trong kỳ.
- Tổng chi = tổng giao dịch `expense` trong kỳ.
- Chênh lệch thu chi = tổng thu − tổng chi.
- Nếu chưa quản lý số dư đầu kỳ, không gọi chênh lệch thu chi là tổng tiền thực có.
- Dùng kiểu số chính xác cho tiền; tránh phép tính tiền bằng số thực dấu phẩy động.
- Xác định quy tắc ngày giao dịch, múi giờ và kỳ báo cáo nhất quán.
- Với offline-first, định nghĩa trạng thái đồng bộ, retry, idempotency và quy tắc xử lý xung đột.

## 9. Bảo mật và vận hành

- Bật RLS cho mọi bảng chứa dữ liệu người dùng.
- Kiểm thử truy cập bằng ít nhất hai tài khoản riêng biệt.
- Không để `service_role` key trong app.
- Không tin cậy việc ẩn UI để phân quyền; quyền phải được kiểm tra ở database/server.
- Quản lý schema bằng migration có phiên bản.
- Xử lý lỗi xác thực, hết hạn phiên, mất kết nối và lỗi API.
- Xác định quy trình xóa tài khoản và dữ liệu liên quan.
- Không ghi thông tin tài chính nhạy cảm vào log không cần thiết.

## 10. Tiêu chí nghiệm thu

- [ ] Tạo, sửa, xóa giao dịch thu/chi được.
- [ ] Tổng thu, tổng chi và chênh lệch thu chi chính xác.
- [ ] Lọc theo thời gian và danh mục đúng.
- [ ] Dữ liệu được lưu trên Supabase và tồn tại sau khi mở lại app.
- [ ] Người dùng không thể đọc hoặc sửa dữ liệu của người khác.
- [ ] Không có khóa bí mật đặc quyền trong bundle ứng dụng.
- [ ] Có thể xuất dữ liệu sao lưu hợp lệ.
- [ ] Nếu có offline-first, giao dịch tạo offline được đồng bộ đúng khi có mạng.
- [ ] Giao diện hỗ trợ tiếng Việt và tiếng Anh.
- [ ] Các luồng nghiệp vụ và quyền truy cập quan trọng có kiểm thử tự động.

## 11. Các quyết định còn cần chốt

**Đã chốt**
- Backend/database: Supabase + PostgreSQL.
- Mobile framework: React Native + Expo + TypeScript.
- Ưu tiên phát hành iOS trước.

**Cần chốt**
1. **Chế độ mạng:** chỉ online hay offline-first với local storage và hàng đợi đồng bộ.
2. **Đăng nhập:** email/mật khẩu, Sign in with Apple hay cả hai.
3. **Ngôn ngữ mặc định:** tiếng Việt, tiếng Anh hay tự động theo iPhone.
4. **Số dư:** chỉ chênh lệch thu chi hay hỗ trợ số dư đầu kỳ và nhiều ví.
5. **Tiền tệ:** chỉ VND hay hỗ trợ nhiều loại tiền tệ.
6. **Phong cách giao diện:** tối giản, nhiều biểu đồ hay fintech cao cấp.

## 12. Bước tiếp theo

1. Chốt chế độ offline và phương thức đăng nhập.
2. Hoàn thiện PRD và sơ đồ điều hướng.
3. Hoàn thiện schema PostgreSQL, migrations và RLS cho tất cả bảng.
4. Khởi tạo dự án Expo và cấu hình môi trường Supabase.
5. Triển khai giao dịch, dashboard và ngân sách.
6. Kiểm thử bảo mật, đồng bộ và chuẩn bị phát hành iOS.

## 13. Tài liệu chính thức

- Supabase: https://supabase.com/
- Supabase Docs: https://supabase.com/docs
- Supabase Auth: https://supabase.com/docs/guides/auth
- PostgreSQL: https://www.postgresql.org/
- Expo: https://expo.dev/
- React Native: https://reactnative.dev/
