const fs = require('fs');
const path = require('path');

const viContent = fs.readFileSync('D:/Projects/my-wallet/src/i18n/vi.ts', 'utf8');
const keyMatches = viContent.matchAll(/'([^']+)':/g);
const validKeys = new Set();
for (const m of keyMatches) validKeys.add(m[1]);

const appDir = 'D:/Projects/my-wallet/src';

function scanDir(dir, prefix) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name === 'node_modules' || f.name === '__tests__') continue;
      scanDir(fp, prefix + f.name + '/');
    } else if (f.name.endsWith('.tsx') && !f.name.includes('test.')) {
      const content = fs.readFileSync(fp, 'utf8');
      const tCalls = content.matchAll(/t\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
      for (const m of tCalls) {
        const key = m[1];
        if (!key.includes('.') && key.length < 3) continue;
        if (!validKeys.has(key)) {
          let ln = 1;
          for (let i = 0; i < m.index && i < content.length; i++) {
            if (content[i] === '\n') ln++;
          }
          console.log(`MISSING ${prefix}${f.name}:${ln}: '${key}'`);
        }
      }
    }
  }
}
scanDir(appDir, '');
console.log('Check complete.');

// Check for hardcoded Vietnamese in Text/components
console.log('\n=== HARDCODED VN ===');
const vnPhrases = [
  'Cơ cấu', 'Tiếng Việt', 'English', 'Nam', 'Chào buổi',
  'Tổng quan', 'Giao dịch', 'Ngân sách', 'Cài đặt',
  'Chưa có', 'Không có', 'Thêm thu', 'Quét hóa',
  'Đặt ngân sách', 'Báo cáo tuần', 'Chi tiết', 'Xem tất cả',
  'Cảnh báo ngân sách', 'Số dư khả dụng', 'An toàn',
  'Tổng thu', 'Tổng chi', 'Chênh lệch thu chi',
  'Cơ cấu chi tiêu', 'Giao dịch gần đây',
  'Cơ cấu', 'Đã chi', 'Giới hạn', 'Đã dùng',
  'Hạn mức chi mỗi tháng', 'Chưa đặt', 'Sắp hết ngân sách', 'Vượt ngân sách',
  'Ngôn ngữ', 'Giao diện', 'Theo hệ thống', 'Sáng', 'Tối',
  'Đăng xuất', 'Dữ liệu', 'Xuất file sao lưu', 'Khôi phục từ file sao lưu',
  'Không đọc được dữ liệu',
];
function scanDir2(dir, prefix) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name === 'node_modules' || f.name === '__tests__') continue;
      scanDir2(fp, prefix + f.name + '/');
    } else if (f.name.endsWith('.tsx')) {
      const lines = fs.readFileSync(fp, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Only check lines with Text or TextInput
        if (!line.includes('<Text') && !line.includes('<AppText')) continue;
        if (line.includes('{t(')) continue;
        for (const phrase of vnPhrases) {
          if (line.includes(phrase) && !line.includes('//')) {
            console.log(`${prefix}${f.name}:${i+1}: ${line.trim().slice(0, 90)}`);
            break;
          }
        }
      }
    }
  }
}
scanDir2(appDir, '');
console.log('\nDone.');