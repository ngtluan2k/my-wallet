# Cấu hình Supabase cho Ví Mình

Checklist cho project Supabase (dashboard + CLI). Làm lại khi tạo project mới.

## 1. Database

```
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Migration theo thứ tự:

| File | Nội dung |
|---|---|
| `20240101000000_initial_schema.sql` | Schema v1 (cũ) |
| `20261102000000_v2_sync.sql` | Bảng đồng bộ v2 (id text, BIGINT, soft delete, `server_updated_at`) |
| `20261102010000_drop_v1_signup_trigger.sql` | Bỏ trigger đăng ký cũ (nguyên nhân lỗi "Database error saving new user") |
| `20261102020000_drop_unused_v1_tables.sql` | Xoá bảng `users`, `profiles` không còn dùng |
| `20261102030000_recurring.sql` | Bảng `recurring` cho giao dịch định kỳ (app cần bảng này để đồng bộ) |
| `20261103000000_debts.sql` | Bảng `debts` cho sổ nợ (cho vay / đi vay; app cần bảng này để đồng bộ) |

Nếu bảng v1 từng được tạo bằng SQL Editor (lịch sử migration trên server trống), đánh dấu trước:
`npx supabase migration repair --status applied 20240101000000`.

## 2. Edge Function xoá tài khoản

```
npx supabase functions deploy delete-account
```

Không cần secret thêm: `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` có sẵn trong môi trường function.

## 3. Authentication (dashboard)

- **URL Configuration → Redirect URLs**: thêm `mywallet://**` (bản build) và `exp://**` (Expo Go, chỉ khi dev).
- **Emails → SMTP Settings**: dùng SMTP riêng (Resend, Brevo, SendGrid…). SMTP mặc định chỉ gửi vài email mỗi giờ.
- **Emails → Templates**: dán `templates/confirm-signup.html` vào "Confirm signup" và `templates/reset-password.html` vào "Reset password" (tiêu đề ghi ở đầu mỗi file).
- **Providers → Email**: bật "Confirm email" cho bản phát hành. Khi test nhanh có thể tắt.
- **Attack Protection**: bật "Leaked password protection" (gói Pro) và giữ độ dài mật khẩu tối thiểu 8 (khớp với app).

## 4. Kiểm tra

- **Advisors → Security Advisor** và **Performance Advisor**: không còn cảnh báo về RLS.
- Đăng ký → xác nhận email → đăng nhập → thêm giao dịch → thấy dòng mới trong bảng `transactions`.
- Quên mật khẩu → mở link trên điện thoại → màn "Đặt mật khẩu mới".
- Xoá tài khoản thử → user biến mất khỏi Authentication, các bảng không còn dòng của user đó.

## 5. Build để test trên máy thật

Face ID và link `mywallet://` không chạy trong Expo Go trên iOS. Dùng development build:

```
npx eas-cli@latest build --profile development --platform ios
npx expo start --dev-client
```

`.env` (EXPO_PUBLIC_SUPABASE_URL / KEY) được đưa vào bản build. Chỉ để khoá publishable/anon ở đây, không bao giờ để service role key.
