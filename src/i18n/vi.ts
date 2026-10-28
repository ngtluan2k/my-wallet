export const vi = {
  'app.name': 'Ví Mình',
  'app.slogan': 'Hiểu dòng tiền, sống chủ động.',

  'tab.dashboard': 'Tổng quan',
  'tab.transactions': 'Giao dịch',
  'tab.budget': 'Ngân sách',
  'tab.settings': 'Cài đặt',

  'common.save': 'Lưu',
  'common.cancel': 'Hủy',
  'common.delete': 'Xóa',
  'common.all': 'Tất cả',
  'common.retry': 'Thử lại',
  'common.error': 'Đã có lỗi',
  'common.loading': 'Đang tải…',

  'type.income': 'Thu',
  'type.expense': 'Chi',

  'summary.income': 'Tổng thu',
  'summary.expense': 'Tổng chi',
  'summary.difference': 'Chênh lệch thu chi',

  'dashboard.spendingByCategory': 'Cơ cấu chi tiêu',
  'dashboard.noExpenses': 'Chưa có khoản chi nào trong tháng này.',
  'dashboard.recent': 'Giao dịch gần đây',
  'dashboard.budgetAlerts': 'Cảnh báo ngân sách',

  'transactions.empty': 'Không có giao dịch nào.',
  'transactions.search': 'Tìm theo ghi chú',
  'transactions.add': 'Thêm giao dịch',
  'transactions.edit': 'Sửa giao dịch',
  'transactions.deleteConfirm': 'Xóa giao dịch này?',

  'form.amount': 'Số tiền',
  'form.category': 'Danh mục',
  'form.date': 'Ngày',
  'form.note': 'Ghi chú',
  'form.notePlaceholder': 'Không bắt buộc',
  'form.today': 'Hôm nay',
  'form.error.amount_invalid': 'Nhập số tiền lớn hơn 0.',
  'form.error.category_invalid': 'Chọn một danh mục.',
  'form.error.category_type_mismatch': 'Danh mục không khớp với loại giao dịch.',
  'form.error.date_invalid': 'Ngày không hợp lệ.',
  'form.error.note_too_long': 'Ghi chú quá dài.',

  'budget.intro': 'Hạn mức chi mỗi tháng theo danh mục. Áp dụng cho mọi tháng.',
  'budget.limitPlaceholder': 'Chưa đặt',
  'budget.spentOf': 'Đã chi {spent} / {limit}',
  'budget.remaining': 'Còn lại {amount}',
  'budget.overBy': 'Vượt {amount}',
  'budget.status.warning': 'Sắp hết ngân sách',
  'budget.status.over': 'Vượt ngân sách',

  'settings.language': 'Ngôn ngữ',
  'settings.theme': 'Giao diện',
  'settings.system': 'Theo hệ thống',
  'settings.light': 'Sáng',
  'settings.dark': 'Tối',
  'settings.data': 'Dữ liệu',
  'settings.dataNote':
    'Dữ liệu chỉ được lưu trên thiết bị này. Nếu xóa ứng dụng hoặc mất máy khi chưa sao lưu, dữ liệu sẽ mất.',
  'settings.export': 'Xuất file sao lưu',
  'settings.import': 'Khôi phục từ file sao lưu',
  'settings.importConfirm': 'Khôi phục sẽ thay thế toàn bộ dữ liệu hiện tại bằng dữ liệu trong file. Tiếp tục?',
  'settings.importConfirmAction': 'Khôi phục',
  'settings.importSuccess': 'Đã khôi phục {count} giao dịch.',
  'settings.exportUnavailable': 'Thiết bị không hỗ trợ chia sẻ file.',
  'settings.exportFailed': 'Không thể xuất file sao lưu.',
  'settings.importFailed': 'Không thể đọc file. Dữ liệu hiện tại không thay đổi.',
  'settings.importError.not_json': 'File không phải JSON hợp lệ. Dữ liệu hiện tại không thay đổi.',
  'settings.importError.not_a_backup': 'Đây không phải file sao lưu của Ví Mình. Dữ liệu hiện tại không thay đổi.',
  'settings.importError.invalid_format': 'File sao lưu bị hỏng hoặc sai định dạng. Dữ liệu hiện tại không thay đổi.',
  'settings.importError.unsupported_version':
    'File sao lưu được tạo từ phiên bản mới hơn. Hãy cập nhật ứng dụng. Dữ liệu hiện tại không thay đổi.',

  'signing.title': 'Ứng dụng sắp hết hạn',
  'signing.daysLeft':
    'Ứng dụng sẽ không mở được sau {days} ngày (lúc {time} ngày {date}). Hãy xuất file sao lưu rồi ký lại bằng Sideloadly.',
  'signing.today':
    'Ứng dụng sẽ không mở được từ {time} hôm nay. Hãy xuất file sao lưu rồi ký lại bằng Sideloadly ngay.',
  'signing.settingsLabel': 'Chữ ký ứng dụng hết hạn lúc {time} ngày {date} (còn {days} ngày).',

  'storage.error.title': 'Không đọc được dữ liệu',
  'storage.error.corrupt':
    'File dữ liệu bị hỏng. Bạn có thể khôi phục từ file sao lưu. Ứng dụng sẽ không ghi đè dữ liệu cho đến khi bạn khôi phục.',
  'storage.error.unsupported_version': 'Dữ liệu được tạo từ phiên bản mới hơn. Hãy cập nhật ứng dụng.',
  'storage.error.read_failed': 'Không thể đọc file dữ liệu.',
  'storage.saveFailed': 'Không thể lưu. Thay đổi chưa được ghi lại.',

  'category.food': 'Ăn uống',
  'category.transport': 'Di chuyển',
  'category.shopping': 'Mua sắm',
  'category.bills': 'Hóa đơn',
  'category.housing': 'Nhà ở',
  'category.health': 'Sức khỏe',
  'category.education': 'Học tập',
  'category.entertainment': 'Giải trí',
  'category.otherExpense': 'Chi khác',
  'category.salary': 'Lương',
  'category.bonus': 'Thưởng',
  'category.investment': 'Đầu tư',
  'category.otherIncome': 'Thu khác',
  'category.unknown': 'Không rõ',
} as const;

export type TranslationKey = keyof typeof vi;
