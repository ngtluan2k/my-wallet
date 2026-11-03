# Ví Mình — Spec màn hình đã chốt

Tài liệu này là **chuẩn** cho UI. Ảnh `screen_*.png` và `code_*.html` trong thư mục này chỉ là tham khảo
về phong cách (màu, card, bố cục). Khi ảnh khác với tài liệu này, làm theo tài liệu này.

Quyết định sản phẩm (11/2026):

- Bắt buộc đăng nhập bằng email + mật khẩu (Supabase). Không có Apple / Google.
- Dữ liệu lưu trên máy theo từng tài khoản và đồng bộ lên Supabase. App vẫn dùng được khi mất mạng.
- Có nhiều ví, số dư ban đầu, sổ nợ (cho vay / đi vay), giờ giao dịch (không bắt buộc). Không tạo chuyển khoản giữa các ví (chuyển khoản cũ vẫn hiển thị, sửa và xoá được).
- Chỉ dùng VND. Không đổi tiền tệ.
- Khoá ứng dụng bằng mã PIN 4 số, có thể mở bằng Face ID / Touch ID. Mặc định tắt.
- Không có: quét hoá đơn, thông báo (chuông), ảnh avatar, lời chào theo tên.

Quy tắc chung:

- Mọi nút trên màn hình đều phải hoạt động. Tính năng chưa có thì không hiển thị.
- Màu lấy từ theme (`src/theme`), có cả sáng và tối. Chuỗi lấy từ `src/i18n` (vi + en).
- Số tiền: số nguyên đồng, hiển thị `1.500.000 ₫` (vi) hoặc `₫1,500,000` (en), chữ số tabular.
- Màu thống nhất ở mọi màn: **thu xanh lá** có dấu `+`, **chi đỏ** có dấu `−`, **nợ tím** (`colors.debt`) không có dấu; chuyển khoản cũ màu xám trung tính.
- Nợ và chuyển khoản không tính vào tổng thu/chi, ngân sách hay báo cáo.

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
   Chip trạng thái ngân sách tháng (An toàn / Sắp chạm mức / Vượt ngân sách) khi đã đặt hạn mức; nhấn mở Ngân sách.
5. Thao tác nhanh (4): Thêm thu/chi · Ngân sách · Báo cáo tuần · Ví của tôi.
6. Cảnh báo ngân sách: danh mục có % dùng cao nhất khi ≥ 80% (vàng) hoặc vượt (đỏ), nhãn % ở góc. Nhấn để mở Ngân sách.
7. Phân tích chi tiêu tháng: thanh xếp chồng top 4 danh mục + "Khác", tổng chi, ô % từng danh mục; liên kết Báo cáo tuần.
8. Giao dịch gần đây (5), "Xem tất cả" mở Sổ giao dịch.

Khác ảnh mockup: không có avatar/lời chào theo tên, chuông, "Cập nhật vừa xong", "Quét hoá đơn".
Tên ví lấy từ dữ liệu, không cố định (Momo/Techcombank trong ảnh chỉ là ví dụ).

## Sổ giao dịch (`(tabs)/transactions.tsx`)

1. Tiêu đề "QUẢN LÝ DÒNG TIỀN / Sổ giao dịch", nút **Lọc** (mở sheet: lọc theo ví, theo danh mục; có số bộ lọc đang bật).
2. Thẻ chọn tháng (‹ Tháng này (Tháng 11/2026) ›) + phân đoạn **Tất cả / Chi tiêu / Thu nhập**.
3. Thẻ Chênh lệch thu chi của tháng, với ô Tổng thu / Tổng chi.
4. Ô tìm kiếm theo ghi chú và tên danh mục, không phân biệt dấu ("an uong" tìm ra "Ăn uống").
5. Danh sách nhóm theo ngày: "Hôm nay • 2 Tháng 11", "Hôm qua • …", "15 Tháng 10 • Chủ nhật", kèm chênh lệch của ngày.
   Mỗi dòng: icon danh mục · ghi chú (hoặc tên danh mục) · "Danh mục • giờ" · số tiền · tên ví.
   Chuyển khoản cũ: icon ⇄, tiêu đề "Ví A → Ví B".

## Thêm / sửa giao dịch (`transaction.tsx`, modal)

- Thanh trên: Hủy · Thêm giao dịch / Sửa giao dịch · Lưu.
- Phân đoạn **Chi tiền / Thu tiền / Nợ** (khi sửa chỉ có Chi/Thu; khi sửa chuyển khoản cũ có thêm Chuyển khoản). `?mode=debt&direction=lent|borrowed` mở sẵn chế độ Nợ.
- Thẻ số tiền: nền nhạt và chữ theo màu của loại (xanh/đỏ/tím), số lớn có dấu (nợ không có dấu); dòng đọc số thành chữ tiếng Việt ("Một trăm năm mươi nghìn đồng"), chỉ hiện khi ngôn ngữ là tiếng Việt.
- Lưới danh mục (Chi/Thu): 7 ô + "Xem tất cả" (sheet đủ danh mục). Danh mục đang chọn luôn hiện trong lưới.
  Ẩn với nợ và chuyển khoản.
- Chế độ Nợ: hai thẻ chọn **Cho vay** / **Đi vay** (có mô tả ngắn), ô tên người, ghi chú rằng nợ không tính vào thu chi. Lưu vào Sổ nợ, không tạo giao dịch.
- Ô chi tiết: Ngày · Giờ (có thể bỏ; ẩn với nợ) · Ví (nợ: Lấy tiền từ ví / Nhận tiền vào ví) · Ghi chú.
- Bàn phím số: 1–9, **C**, 0, **000**; cột phải: ⌫ và nút **Xong** cao 3 hàng. **Không có phím "."** (VND không có phần lẻ).
- Nút nhanh **+50.000 / +100.000 / +500.000** **cộng thêm** vào số đang nhập, không nối chuỗi.
- Lỗi hiển thị cụ thể (thiếu danh mục, hai ví trùng nhau…). Khi sửa có nút **Xóa giao dịch**.
- Bộ chọn ví trống có nút **Thêm ví**.

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

## Báo cáo (`report.tsx`)

Phân đoạn **Tuần / Tháng**. Không đi quá kỳ hiện tại.

- **Tuần** (thứ Hai → Chủ nhật): Tổng thu / Tổng chi · cột chi theo từng ngày (hôm nay tô màu chính) · so sánh với tuần trước (± %) · top danh mục chi kèm thanh tỉ lệ.
- **Tháng**: Tổng thu / Tổng chi · Tỷ lệ tiết kiệm ((thu − chi) ÷ thu) · cột thu chi 6 tháng gần nhất · so sánh với tháng trước · top danh mục chi.

## Giao dịch định kỳ (`recurring.tsx`, `recurring-edit.tsx`)

- Danh sách: icon danh mục · ghi chú (hoặc tên danh mục) · "Hằng tháng, ngày 5 · Ví" · "Lần tới: …" · số tiền; nhãn "Tạm dừng".
- Form: Chi/Thu · Số tiền · Danh mục · Ví · Ghi chú · Lặp lại (Hằng tuần / Hằng tháng) · Bắt đầu từ · Tạm dừng (khi sửa) · Xoá.
- Đến ngày, giao dịch được tự thêm vào sổ (cả các lần đã qua nếu ngày bắt đầu ở quá khứ). Xoá quy tắc không xoá giao dịch đã thêm.

## Ví của tôi (`wallets.tsx`) và Thêm/sửa ví (`wallet-edit.tsx`)

- Thẻ Tổng số dư; danh sách ví đang dùng (icon, tên, nhãn Mặc định, loại, số dư hiện tại); nhóm "Đã lưu trữ".
- Form ví: Tên · Loại (Tiền mặt / Ngân hàng / Ví điện tử) · Màu · Số dư ban đầu · Dùng làm ví mặc định.
- Ví chưa có giao dịch: **Xóa**. Ví đã có giao dịch: **Lưu trữ** (giữ lịch sử, ẩn khỏi bộ chọn và khỏi tổng số dư).
  Ví đã lưu trữ có nút **Khôi phục ví**.
  Luôn giữ ít nhất một ví và đúng một ví mặc định.

## Cài đặt (`(tabs)/settings.tsx`)

- Thẻ ứng dụng: "Lưu trên máy · Đồng bộ với tài khoản".
- **Tài khoản**: dòng hồ sơ (tên hiển thị + email, mở màn Hồ sơ) · Đăng xuất (đẩy thay đổi chưa đồng bộ trước; nếu còn thì cảnh báo).
- **Dữ liệu & sao lưu**: Xuất file JSON (nút "Xuất file" trên dòng) · Xuất bảng tính CSV (mở bằng Excel/Numbers) · Khôi phục từ file (kiểm tra đầy đủ rồi xác nhận) · Xóa toàn bộ dữ liệu.
- **Nhắc nhở**: Nhắc ghi chép hằng ngày (bật/tắt, xin quyền thông báo; bị từ chối thì gợi ý mở Cài đặt iPhone) · Giờ nhắc (mặc định 21:00) · Ưu tiên cao (Time Sensitive, mặc định tắt) · Gửi thử thông báo.
  Lời nhắc có âm thanh và đặt số 1 trên icon app; số này mất khi hôm nay đã ghi chép hoặc tắt nhắc.
  Không nhắc nếu hôm nay đã ghi chép (giao dịch định kỳ tự thêm không tính). Bấm thông báo mở màn Thêm giao dịch.
  Lịch nhắc được xếp sẵn 30 ngày và gia hạn mỗi lần mở app.
- **Bảo mật**: Mã PIN khoá ứng dụng (Bật / Đổi mã / Tắt) · Mở khoá bằng Face ID / Touch ID (cần bật PIN trước).
- **Tùy biến**: Quản lý ví · Quản lý danh mục · Giao dịch định kỳ · Đơn vị tiền tệ **VND (₫)** (chỉ hiển thị) · Ngôn ngữ (Hệ thống / Tiếng Việt / English) · Giao diện (Hệ thống / Sáng / Tối).
- **Giới thiệu**: triết lý thiết kế, thông tin chữ ký ứng dụng, Điều khoản dịch vụ, Chính sách quyền riêng tư, phiên bản.

Khác ảnh mockup: không có "Đánh giá trên App Store" (chưa có link), không có trang "Về ứng dụng" riêng,
"Dữ liệu lưu 100% trên máy / An toàn tuyệt đối" đổi thành mô tả đúng (lưu trên máy + đồng bộ tài khoản).

## Hồ sơ (`profile.tsx`)

- Thẻ đầu: vòng tròn chữ cái đầu của tên (không có ảnh avatar), tên hiển thị, email.
- **Thông tin cá nhân**: Tên hiển thị (bắt buộc, ≤ 60 ký tự, lưu vào tài khoản Supabase) · Email (chỉ xem).
- **Đổi mật khẩu**: Mật khẩu hiện tại · Mật khẩu mới (≥ 8 ký tự, khác mật khẩu cũ) · Nhập lại. Kiểm tra mật khẩu hiện tại trước khi đổi.
- Nút Đăng xuất. Lưu tên và đổi mật khẩu cần mạng; lỗi hiện ngay trong form.
- **Xoá tài khoản**: nhập lại mật khẩu → Edge Function `delete-account` xoá user (dữ liệu xoá theo cascade) → đăng xuất, xoá file dữ liệu và PIN trên máy.
- Chưa có: đổi email.

## Danh mục (`categories.tsx`, `category-edit.tsx`)

- Phân đoạn Chi / Thu; danh sách danh mục kèm số giao dịch. Danh mục có sẵn gắn nhãn "Có sẵn", chỉ xem.
- Thêm/sửa danh mục của bạn: Tên (≤ 30 ký tự, không trùng tên trong cùng loại) · Loại (chỉ khi tạo mới) · Biểu tượng · Màu.
- Xoá được khi chưa có giao dịch nào dùng (hạn mức của danh mục cũng bị xoá).

## Điều khoản / Chính sách (`legal.tsx?doc=terms|privacy`)

Xem được cả khi chưa đăng nhập (mở từ màn Đăng ký) và từ Cài đặt → Giới thiệu.

## Đăng nhập / Đăng ký / Quên mật khẩu (`(auth)/`)

- **Đăng nhập**: Email · Mật khẩu (hiện/ẩn) · Quên mật khẩu? · Đăng nhập · "Chưa có tài khoản? Đăng ký ngay".
- **Đăng ký**: Họ tên · Email · Mật khẩu (≥ 8 ký tự, thanh độ mạnh 3 mức) · Xác nhận mật khẩu (dấu ✓ "Khớp") · đồng ý điều khoản (link mở Điều khoản / Chính sách).
  Nếu Supabase bật xác nhận email: hiện thông báo "Đã gửi email xác nhận…".
- **Quên mật khẩu**: Email → gửi liên kết đặt lại. Link mở app (`mywallet://auth-callback?flow=recovery`), app đăng nhập bằng link rồi hiện màn **Đặt mật khẩu mới**. Link hết hạn: báo lỗi ở màn Đăng nhập.
- Link xác nhận email lúc đăng ký cũng mở app và đăng nhập luôn.
- Dòng cuối: "Dữ liệu lưu trên máy và đồng bộ an toàn với tài khoản của bạn".

Khác ảnh mockup: không có Apple ID / Google, không có "Ghi nhớ đăng nhập" (phiên luôn được giữ),
không có "Đăng nhập bằng Face ID" (Face ID dùng để **mở khoá** app sau khi đã đăng nhập),
không có "Email hoặc Số điện thoại" (chỉ email).

## Màn khoá (`components/LockScreen.tsx`)

Hiện khi mở app hoặc quay lại sau hơn 60 giây ở nền, nếu đã bật PIN. Nhập PIN 4 số hoặc dùng Face ID.
Sai 5 lần thì phải chờ 30 giây (gấp đôi mỗi lần sai tiếp, tối đa 15 phút), có đếm ngược; còn ≤ 5 lần thì báo số lần còn lại.
Sai lần thứ 10: tắt khoá và đăng xuất.
"Quên mã PIN?" → đăng xuất (tắt khoá); dữ liệu đã đồng bộ vẫn còn trong tài khoản.
