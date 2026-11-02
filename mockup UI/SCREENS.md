# Ví Mình — Spec màn hình đã chốt

Tài liệu này là **chuẩn** cho UI. Ảnh `screen_*.png` và `code_*.html` trong thư mục này chỉ là tham khảo
về phong cách (màu, card, bố cục). Khi ảnh khác với tài liệu này, làm theo tài liệu này.

Quyết định sản phẩm (11/2026):

- Bắt buộc đăng nhập bằng email + mật khẩu (Supabase). Không có Apple / Google.
- Dữ liệu lưu trên máy theo từng tài khoản và đồng bộ lên Supabase. App vẫn dùng được khi mất mạng.
- Có nhiều ví, số dư ban đầu, chuyển khoản giữa các ví, giờ giao dịch (không bắt buộc).
- Chỉ dùng VND. Không đổi tiền tệ.
- Khoá ứng dụng bằng mã PIN 4 số, có thể mở bằng Face ID / Touch ID. Mặc định tắt.
- Không có: quét hoá đơn, thông báo (chuông), avatar/lời chào theo tên.

Quy tắc chung:

- Mọi nút trên màn hình đều phải hoạt động. Tính năng chưa có thì không hiển thị.
- Màu lấy từ theme (`src/theme`), có cả sáng và tối. Chuỗi lấy từ `src/i18n` (vi + en).
- Số tiền: số nguyên đồng, hiển thị `1.500.000 ₫` (vi) hoặc `₫1,500,000` (en), chữ số tabular.
- Thu màu xanh có dấu `+`, chi màu đỏ có dấu `−`, chuyển khoản màu xám trung tính và không có dấu.
- Chuyển khoản không tính vào tổng thu/chi, ngân sách hay báo cáo.

## Thanh tab

5 vị trí: **Tổng quan · Sổ giao dịch · (+) Thêm mới · Ngân sách · Cài đặt**.
Nút (+) ở giữa mở màn Thêm giao dịch (modal), không phải một tab.
Mỗi tab có thanh trên cùng gồm logo + "Ví Mình" ở trái và **trạng thái đồng bộ** ở phải
(Đã đồng bộ / Đang đồng bộ… / Chờ đồng bộ (N) / Chưa đồng bộ được · Thử lại). Nhấn vào để đồng bộ ngay.

## Tổng quan (`(tabs)/index.tsx`)

1. Banner hết hạn chữ ký (chỉ với bản sideload sắp hết hạn).
2. Thẻ "Tìm thấy dữ liệu cũ" nếu máy còn file từ trước khi có tài khoản: Bỏ qua / Nhập dữ liệu.
3. Tiêu đề: tháng hiện tại + "Tổng quan tài chính".
4. Thẻ lớn: **Tổng số dư các ví** (số dư ban đầu + thu − chi của mọi ví đang dùng), kèm Thu / Chi tháng này.
5. Thao tác nhanh (4): Thêm thu/chi · Ngân sách · Báo cáo tuần · Ví của tôi.
6. Cảnh báo ngân sách: danh mục có % dùng cao nhất khi ≥ 80% (vàng) hoặc vượt (đỏ). Nhấn để mở Ngân sách.
7. Phân tích chi tiêu tháng: thanh xếp chồng top 4 danh mục + "Khác", tổng chi, ô % từng danh mục; liên kết Báo cáo tuần.
8. Giao dịch gần đây (5), "Xem tất cả" mở Sổ giao dịch.

Khác ảnh mockup: không có avatar/lời chào theo tên, chuông, "Cập nhật vừa xong", "Quét hoá đơn".
Tên ví lấy từ dữ liệu, không cố định (Momo/Techcombank trong ảnh chỉ là ví dụ).

## Sổ giao dịch (`(tabs)/transactions.tsx`)

1. Tiêu đề "QUẢN LÝ DÒNG TIỀN / Sổ giao dịch", nút **Lọc** (mở sheet: lọc theo ví, theo danh mục; có số bộ lọc đang bật).
2. Thẻ chọn tháng (‹ Tháng này (Tháng 11/2026) ›) + phân đoạn **Tất cả / Chi tiêu / Thu nhập / Chuyển khoản**.
3. Thẻ Chênh lệch thu chi của tháng, với ô Tổng thu / Tổng chi.
4. Ô tìm kiếm theo ghi chú và tên danh mục, không phân biệt dấu ("an uong" tìm ra "Ăn uống").
5. Danh sách nhóm theo ngày: "Hôm nay • 2 Tháng 11", "Hôm qua • …", "15 Tháng 10 • Chủ nhật", kèm chênh lệch của ngày.
   Mỗi dòng: icon danh mục · ghi chú (hoặc tên danh mục) · "Danh mục • giờ" · số tiền · tên ví.
   Chuyển khoản: icon ⇄, tiêu đề "Ví A → Ví B".

## Thêm / sửa giao dịch (`transaction.tsx`, modal)

- Thanh trên: Hủy · Thêm giao dịch / Sửa giao dịch · Lưu.
- Phân đoạn **Chi tiền / Thu tiền / Chuyển khoản**.
- Thẻ số tiền: số lớn có dấu; dòng đọc số thành chữ tiếng Việt ("Một trăm năm mươi nghìn đồng"), chỉ hiện khi ngôn ngữ là tiếng Việt.
- Lưới danh mục (Chi/Thu): 7 ô + "Xem tất cả" (sheet đủ danh mục). Danh mục đang chọn luôn hiện trong lưới.
  Ẩn với chuyển khoản.
- Ô chi tiết: Ngày · Giờ (có thể bỏ) · Ví nguồn (chuyển khoản: Từ ví + Đến ví) · Ghi chú.
- Bàn phím số: 1–9, **C**, 0, **000**; cột phải: ⌫ và nút **Xong** cao 3 hàng. **Không có phím "."** (VND không có phần lẻ).
- Nút nhanh **+50.000 / +100.000 / +500.000** **cộng thêm** vào số đang nhập, không nối chuỗi.
- Lỗi hiển thị cụ thể (thiếu danh mục, hai ví trùng nhau…). Khi sửa có nút **Xóa giao dịch**.

## Ngân sách (`(tabs)/budget.tsx`)

1. Tiêu đề "Ngân sách", chọn tháng: Tháng trước · **Tháng X/YYYY** · Tháng sau.
2. Thẻ lớn: ngân sách còn lại (tổng hạn mức − đã chi), % đã dùng, thanh tiến độ, Tổng hạn mức / Đã chi thực tế.
   Với tháng hiện tại: "Còn N ngày" và gợi ý **chi tối đa X/ngày** = phần còn lại ÷ số ngày còn lại (không âm).
3. "Định mức từng hạng mục" + nút sắp xếp (theo % / theo tên).
   Mỗi thẻ: icon, tên, hạn mức, nhãn trạng thái, thanh tiến độ, Đã chi / Còn lại.
   Trạng thái: **An toàn** (< 80%) · **Sắp chạm mức** (80–99%) · **Đã chi đủ** (đúng 100%) · **Vượt X** (> 100%, thẻ viền đỏ).
4. Nút **Điều chỉnh hạn mức**: chuyển sang chế độ nhập hạn mức cho mọi danh mục chi; để trống để bỏ hạn mức.

Hạn mức là theo tháng cho từng danh mục chi và áp dụng cho mọi tháng.
Khác ảnh mockup: danh mục theo bộ danh mục có sẵn của app (ảnh gộp "Mua sắm & Giải trí" chỉ là ví dụ).

## Báo cáo tuần (`report.tsx`)

Chọn tuần (thứ Hai → Chủ nhật, không đi quá tuần hiện tại) · Tổng thu / Tổng chi ·
cột chi theo từng ngày (hôm nay tô màu chính) · so sánh với tuần trước (± %) · top danh mục chi kèm thanh tỉ lệ.

## Ví của tôi (`wallets.tsx`) và Thêm/sửa ví (`wallet-edit.tsx`)

- Thẻ Tổng số dư; danh sách ví đang dùng (icon, tên, nhãn Mặc định, loại, số dư hiện tại); nhóm "Đã lưu trữ".
- Form ví: Tên · Loại (Tiền mặt / Ngân hàng / Ví điện tử) · Màu · Số dư ban đầu · Dùng làm ví mặc định.
- Ví chưa có giao dịch: **Xóa**. Ví đã có giao dịch: **Lưu trữ** (giữ lịch sử, ẩn khỏi bộ chọn và khỏi tổng số dư).
  Luôn giữ ít nhất một ví và đúng một ví mặc định.

## Cài đặt (`(tabs)/settings.tsx`)

- Thẻ ứng dụng: "Lưu trên máy · Đồng bộ với tài khoản".
- **Tài khoản**: email đang đăng nhập · Đăng xuất (đẩy thay đổi chưa đồng bộ trước; nếu còn thì cảnh báo).
- **Dữ liệu & sao lưu**: Xuất file JSON · Khôi phục từ file (kiểm tra đầy đủ rồi xác nhận) · Xóa toàn bộ dữ liệu.
- **Bảo mật**: Mã PIN khoá ứng dụng (Bật / Đổi mã / Tắt) · Mở khoá bằng Face ID / Touch ID (cần bật PIN trước).
- **Tùy biến**: Quản lý ví · Đơn vị tiền tệ **VND (₫)** (chỉ hiển thị) · Ngôn ngữ (Hệ thống / Tiếng Việt / English) · Giao diện (Hệ thống / Sáng / Tối).
- **Giới thiệu**: triết lý thiết kế, thông tin chữ ký ứng dụng, phiên bản.

Khác ảnh mockup: không có "Đánh giá trên App Store" (chưa có link), không có trang "Về ứng dụng" riêng,
"Dữ liệu lưu 100% trên máy / An toàn tuyệt đối" đổi thành mô tả đúng (lưu trên máy + đồng bộ tài khoản).

## Đăng nhập / Đăng ký / Quên mật khẩu (`(auth)/`)

- **Đăng nhập**: Email · Mật khẩu (hiện/ẩn) · Quên mật khẩu? · Đăng nhập · "Chưa có tài khoản? Đăng ký ngay".
- **Đăng ký**: Họ tên · Email · Mật khẩu (≥ 8 ký tự) · Xác nhận mật khẩu · đồng ý điều khoản.
  Nếu Supabase bật xác nhận email: hiện thông báo "Đã gửi email xác nhận…".
- **Quên mật khẩu**: Email → gửi liên kết đặt lại.
- Dòng cuối: "Dữ liệu lưu trên máy và đồng bộ an toàn với tài khoản của bạn".

Khác ảnh mockup: không có Apple ID / Google, không có "Ghi nhớ đăng nhập" (phiên luôn được giữ),
không có "Đăng nhập bằng Face ID" (Face ID dùng để **mở khoá** app sau khi đã đăng nhập),
không có "Email hoặc Số điện thoại" (chỉ email).

## Màn khoá (`components/LockScreen.tsx`)

Hiện khi mở app hoặc quay lại sau hơn 60 giây ở nền, nếu đã bật PIN. Nhập PIN 4 số hoặc dùng Face ID.
"Quên mã PIN?" → đăng xuất (tắt khoá); dữ liệu đã đồng bộ vẫn còn trong tài khoản.
