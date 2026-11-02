# Ví Mình (My Wallet) — Kế hoạch phát triển ứng dụng

## 1. Tổng quan

- **Tên tiếng Việt:** Ví Mình
- **Tên tiếng Anh:** My Wallet
- **Slogan tiếng Việt:** Hiểu dòng tiền, sống chủ động.
- **Slogan tiếng Anh:** Understand your money. Take control of your life.
- **Mục tiêu:** Ứng dụng quản lý thu chi cá nhân, giúp người dùng ghi chép giao dịch, theo dõi ngân sách và hiểu rõ dòng tiền.
- **Định hướng nền tảng:** Multiplatform; ưu tiên phát hành iOS trước.
- **Phạm vi ban đầu:** Ứng dụng iOS chạy độc lập, không cần backend hoặc database server.

> Lưu ý thương hiệu: “My Wallet” là cụm từ phổ biến. Trước khi phát hành, cần kiểm tra tên ứng dụng trên App Store, tên miền và khả năng đăng ký nhãn hiệu.

> **Cập nhật 11/2026 — quyết định đã chốt** (thay cho các ý tương ứng bên dưới; spec màn hình ở `mockup UI/SCREENS.md`):
>
> - **Bắt buộc đăng nhập** bằng email + mật khẩu (Supabase Auth). Không làm Apple/Google trong đợt này.
> - **Lưu trên máy trước, đồng bộ sau:** file JSON trên máy theo từng tài khoản là nguồn dữ liệu gốc; mọi thay đổi được đưa vào hàng đợi và đồng bộ lên Supabase. App vẫn dùng được khi mất mạng sau lần đăng nhập đầu.
> - **Nhiều ví và số dư:** mỗi ví có số dư ban đầu; số dư = số dư ban đầu + thu − chi ± chuyển khoản. Có giao dịch **chuyển khoản** giữa các ví (không tính vào thu/chi) và giờ giao dịch (không bắt buộc).
> - **Chỉ VND.** Không đổi tiền tệ.
> - **Báo cáo tuần**; không làm quét hoá đơn.
> - **Khoá ứng dụng** bằng PIN 4 số, mở bằng Face ID/Touch ID; mặc định tắt.

## 2. Nguyên tắc sản phẩm

1. **Ưu tiên iOS:** Hoàn thiện một ứng dụng có thể sử dụng thực tế trên iPhone.
2. ~~**Không cần backend/DB server:** Không yêu cầu tài khoản, đăng nhập hoặc máy chủ trong phiên bản đầu.~~ Đã thay bằng: bắt buộc tài khoản; Supabase dùng để đồng bộ và sao lưu theo tài khoản (xem cập nhật ở trên).
3. **Lưu trữ cục bộ:** Dữ liệu phải được lưu trên thiết bị để không mất khi đóng ứng dụng.
4. **Offline-first:** Các chức năng chính hoạt động không cần Internet (sau lần đăng nhập đầu tiên).
5. **Multiplatform-ready:** Tách biệt nghiệp vụ, mô hình dữ liệu, giao diện và tầng lưu trữ để thuận tiện mở rộng Android/Web.
6. **Privacy-first:** Dữ liệu tài chính được lưu cục bộ; cung cấp cơ chế sao lưu và khôi phục.

**Diễn giải “không cần DB”:** Không sử dụng database server. MVP có thể lưu dữ liệu trong file JSON cục bộ. Nếu quy mô dữ liệu hoặc yêu cầu truy vấn tăng lên, có thể chuyển sang database cục bộ mà không nhất thiết phải bổ sung backend.

## 3. Kế hoạch phát triển

Thời gian dưới đây là ước tính ban đầu, phụ thuộc vào độ hoàn thiện UI/UX, kiểm thử và quy trình phát hành.

### Giai đoạn 1 — Nền tảng và giao diện (Tuần 1)

- Thiết lập dự án và cấu trúc thư mục.
- Xây dựng hệ thống giao diện, màu sắc, typography và icon.
- Hỗ trợ giao diện sáng/tối.
- Xây dựng điều hướng và các màn hình chính.

### Giai đoạn 2 — Thu chi cá nhân (Tuần 2)

- Thêm, sửa và xóa giao dịch thu/chi.
- Thông tin giao dịch: số tiền, loại giao dịch, danh mục, ngày và ghi chú.
- Lọc theo ngày, tháng, danh mục và loại giao dịch.
- Tính tổng thu, tổng chi và số dư.

### Giai đoạn 3 — Dashboard và ngân sách (Tuần 3)

- Tổng quan tài chính theo tháng.
- Biểu đồ thu chi và cơ cấu chi tiêu.
- Thiết lập ngân sách theo danh mục.
- Cảnh báo khi chi tiêu gần hoặc vượt ngân sách.

### Giai đoạn 4 — Lưu trữ và bảo mật (Tuần 4)

- Lưu dữ liệu cục bộ, hoạt động offline.
- Xuất/nhập JSON để sao lưu và khôi phục.
- Khóa ứng dụng bằng Face ID hoặc mã PIN tùy chọn.
- Xử lý dữ liệu rỗng, lỗi nhập liệu và các trường hợp biên.

### Giai đoạn 5 — Kiểm thử và phát hành iOS (Tuần 5)

- Kiểm thử giao dịch, số dư và lưu trữ.
- Kiểm tra các kích thước màn hình iPhone.
- Kiểm tra quy trình sao lưu và khôi phục.
- Chuẩn bị icon, ảnh chụp màn hình và thông tin App Store.

## 4. Công nghệ đề xuất

| Thành phần | Công nghệ | Lý do |
|---|---|---|
| Framework | React Native + Expo | Dùng chung phần lớn mã nguồn cho iOS, Android và Web |
| Ngôn ngữ | TypeScript | Kiểu dữ liệu tĩnh, giảm lỗi nghiệp vụ |
| Điều hướng | Expo Router | Điều hướng theo cấu trúc file |
| UI | Design system tùy biến (hỗ trợ sáng/tối) | Xây dựng giao diện thương hiệu riêng |
| Quản lý trạng thái | Thư viện state (ví dụ Zustand) | Tách biệt UI và nghiệp vụ |
| Lưu giao dịch MVP | File JSON cục bộ (expo-file-system) | Không cần database server |
| Cài đặt ứng dụng | AsyncStorage | Lưu ngôn ngữ, giao diện và tùy chọn |
| Khóa ứng dụng | expo-local-authentication | Face ID / mã PIN |
| Biểu đồ | Gói biểu đồ tương thích React Native | Thống kê thu chi và ngân sách |
| Kiểm thử | Jest (jest-expo) + React Native Testing Library | Kiểm thử nghiệp vụ và giao diện |

Các thư viện cụ thể nên được lựa chọn và kiểm tra tính tương thích tại thời điểm khởi tạo dự án.

## 5. Kiến trúc đề xuất

```text
Presentation Layer
  ├── Dashboard
  ├── Transactions
  ├── Budget
  ├── Reports
  └── Settings
          |
          v
Domain Layer
  ├── Transaction rules
  ├── Balance calculation
  └── Budget rules
          |
          v
Repository Interfaces
          |
          v
Local JSON Storage (MVP)
          |
          └── Future: API / Cloud Sync
```

### Nguyên tắc kiến trúc

- UI không trực tiếp đọc/ghi file.
- Nghiệp vụ tính toán thu chi không phụ thuộc cách lưu trữ.
- Dùng repository interface để có thể thay đổi phương thức lưu trữ.
- Kiểm tra dữ liệu đầu vào và xử lý lỗi đọc/ghi file.
- Ghi file theo cách an toàn để giảm nguy cơ hỏng dữ liệu.
- Thiết kế phiên bản và quy tắc chuyển đổi dữ liệu để hỗ trợ nâng cấp sau này.

**Giới hạn JSON:** Phù hợp với MVP nhỏ, ít giao dịch và không có nhiều thao tác đồng thời. Khi dữ liệu lớn, cần truy vấn phức tạp hoặc đồng bộ nhiều thiết bị, nên cân nhắc database cục bộ và backend.

## 6. Phạm vi MVP phiên bản 1.0

### 6.1. Tổng quan

- Dashboard thu chi tháng hiện tại.
- Tổng thu, tổng chi và số dư.
- Biểu đồ cơ cấu chi tiêu.

### 6.2. Giao dịch

- Thêm, sửa và xóa khoản thu/chi.
- Quản lý danh mục và ghi chú.
- Tìm kiếm, lọc và xem lịch sử giao dịch.

### 6.3. Ngân sách

- Thiết lập ngân sách tháng.
- Theo dõi mức sử dụng ngân sách theo danh mục.

### 6.4. Cài đặt và dữ liệu

- Tiếng Việt và tiếng Anh.
- Giao diện sáng/tối.
- Xuất và nhập file sao lưu.
- Khóa ứng dụng tùy chọn.

### 6.5. Chưa triển khai trong MVP

- ~~Đăng nhập và quản lý tài khoản.~~ Đã đưa vào MVP (đăng nhập email bắt buộc).
- ~~Đồng bộ cloud.~~ Đã đưa vào MVP (đồng bộ Supabase theo tài khoản).
- Đăng nhập Apple/Google, đổi email/mật khẩu trong app, xoá tài khoản.
- Đa tiền tệ.
- Quét hoá đơn.
- Liên kết ngân hàng.
- Phân tích chi tiêu bằng AI.
- Hệ thống quản trị.
- Tính năng cộng tác nhiều người dùng.

## 7. Yêu cầu dữ liệu và quy tắc nghiệp vụ

### 7.1. Giao dịch

Các trường dữ liệu đề xuất:

- `id`: mã giao dịch duy nhất.
- `type`: `income` hoặc `expense`.
- `amount`: số tiền dương.
- `categoryId`: mã danh mục.
- `transactionDate`: ngày giao dịch.
- `note`: ghi chú không bắt buộc.
- `createdAt`: thời điểm tạo.
- `updatedAt`: thời điểm cập nhật.

### 7.2. Quy tắc tính toán

- Tổng thu = tổng số tiền của các giao dịch `income` trong kỳ.
- Tổng chi = tổng số tiền của các giao dịch `expense` trong kỳ.
- Chênh lệch thu chi = tổng thu − tổng chi.
- Số dư hiển thị phải được định nghĩa rõ: nếu không quản lý số dư đầu kỳ, chỉ nên gọi là **chênh lệch thu chi**, không mặc định đó là tổng tiền thực có.
- Lưu số tiền theo đơn vị tiền tệ nhỏ nhất hoặc kiểu số chính xác; tránh dùng số thực dấu phẩy động cho phép tính tiền.
- Xác định rõ quy tắc múi giờ và ngày giao dịch để báo cáo theo tháng nhất quán.

### 7.3. Dữ liệu cục bộ

- Dữ liệu phải tồn tại sau khi đóng và mở lại ứng dụng.
- Có thông báo rõ ràng khi sao lưu hoặc khôi phục thất bại.
- Kiểm tra định dạng và phiên bản file trước khi nhập.
- Không ghi đè dữ liệu hiện tại khi file nhập không hợp lệ.
- Giải thích cho người dùng rằng dữ liệu cục bộ có thể mất nếu thiết bị hoặc ứng dụng bị xóa mà chưa sao lưu.

## 8. Tiêu chí nghiệm thu MVP

- [ ] Người dùng tạo, sửa và xóa được giao dịch thu/chi.
- [ ] Tổng thu, tổng chi và chênh lệch thu chi được tính chính xác.
- [ ] Bộ lọc theo thời gian và danh mục hoạt động đúng.
- [ ] Dữ liệu vẫn tồn tại sau khi đóng và mở lại ứng dụng.
- [ ] Ứng dụng dùng được khi không có Internet.
- [ ] Có thể xuất và nhập file sao lưu hợp lệ.
- [ ] File sao lưu không hợp lệ không làm hỏng dữ liệu đang có.
- [ ] Giao diện hỗ trợ tiếng Việt và tiếng Anh.
- [ ] Không có lỗi nghiêm trọng trên các thiết bị iPhone mục tiêu.
- [ ] Các luồng nghiệp vụ quan trọng có kiểm thử tự động.
- [ ] Đăng ký, đăng nhập, quên mật khẩu và đăng xuất hoạt động; dữ liệu mỗi tài khoản tách biệt trên máy.
- [ ] Thay đổi khi mất mạng được đồng bộ khi có mạng lại; đăng nhập trên máy khác tải về đủ dữ liệu.
- [ ] Số dư từng ví và tổng số dư đúng khi có chuyển khoản; chuyển khoản không làm thay đổi tổng thu/chi.
- [ ] Dữ liệu và file sao lưu từ phiên bản trước (v1, chưa có ví) được nâng cấp tự động, không mất giao dịch.
- [ ] Khoá ứng dụng bằng PIN/Face ID hoạt động khi bật, không làm phiền khi tắt.

## 9. Lộ trình sau MVP

### Phiên bản 1.x

- Cải thiện báo cáo và bộ lọc.
- Thêm mục tiêu tiết kiệm.
- Thêm giao dịch định kỳ nếu có nhu cầu.
- Cải thiện trải nghiệm sao lưu và phục hồi.

### Giai đoạn multiplatform

- Phát triển Android từ nền tảng React Native + Expo.
- Đánh giá mức độ phù hợp của giao diện cho Web.
- Kiểm tra khác biệt về lưu trữ, bảo mật và vòng đời ứng dụng giữa các nền tảng.

### Giai đoạn đồng bộ tùy chọn trong tương lai

- Thiết kế backend/API nếu cần đồng bộ nhiều thiết bị.
- Xác định cơ chế xác thực, phân quyền và bảo vệ dữ liệu.
- Xây dựng chiến lược đồng bộ, xử lý xung đột và sao lưu.
- Không bắt buộc triển khai các thành phần này trong MVP.

## 10. Các quyết định cần chốt trước khi code

1. **Lưu trữ:** JSON cục bộ, dữ liệu tạm trong bộ nhớ hay database cục bộ không có backend.
2. **Ngôn ngữ mặc định:** Tiếng Việt, tiếng Anh hay tự động theo ngôn ngữ iPhone.
3. **Phong cách giao diện:** Tối giản, nhiều biểu đồ hay phong cách fintech cao cấp.
4. **Số dư:** ~~Chỉ theo dõi chênh lệch thu chi hay hỗ trợ số dư đầu kỳ và nhiều ví.~~ Đã chốt: nhiều ví, có số dư đầu kỳ.
5. **Tiền tệ:** ~~Chỉ VND trong MVP hay hỗ trợ nhiều loại tiền tệ.~~ Đã chốt: chỉ VND.

## 11. Bước tiếp theo

Sau khi chốt các quyết định trên, chuẩn bị các tài liệu và đầu việc:

1. Product Requirements Document (PRD) chi tiết.
2. Sơ đồ điều hướng và danh sách màn hình.
3. Design system cho Ví Mình / My Wallet.
4. Cấu trúc thư mục React Native + Expo và quy ước code.
5. Mô hình dữ liệu, repository và quy tắc nghiệp vụ.
6. Danh sách task theo sprint và tiêu chí nghiệm thu.
7. Kế hoạch kiểm thử và checklist phát hành iOS.
