import { fireEvent, render, screen } from '@testing-library/react-native';

import RegisterScreen from '@/app/(auth)/register';
import { supabase } from '@/data/supabaseClient';
import { useSettings } from '@/state/settings';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('expo-linking', () => ({
  createURL: (path: string, opts?: { queryParams?: Record<string, string> }) =>
    `mywallet://${path}?${new URLSearchParams(opts?.queryParams).toString()}`,
  addEventListener: jest.fn(),
  getInitialURL: jest.fn(async () => null),
}));

const signUp = supabase.auth.signUp as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ language: 'vi', theme: 'light', loaded: true });
});

async function fill() {
  await fireEvent.changeText(screen.getByPlaceholderText('Nguyễn Văn Nam'), 'Nam');
  await fireEvent.changeText(screen.getByPlaceholderText('email@example.com'), '  Nam@Example.COM ');
  await fireEvent.changeText(screen.getByPlaceholderText('Ít nhất 8 ký tự'), 'Abcd1234!');
  await fireEvent.changeText(screen.getByPlaceholderText('Nhập lại mật khẩu'), 'Abcd1234!');
}

describe('register screen', () => {
  it('shows every validation error and does not call the server', async () => {
    await render(<RegisterScreen />);
    await fireEvent.press(screen.getByText('Đăng ký tài khoản'));
    expect(screen.getByText('Vui lòng nhập họ tên.')).toBeTruthy();
    expect(screen.getByText('Vui lòng nhập email.')).toBeTruthy();
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('rates the password, confirms the match, and signs up with a normalized email', async () => {
    signUp.mockResolvedValue({ data: { session: null, user: { id: 'u1' } }, error: null });
    await render(<RegisterScreen />);
    await fill();
    expect(screen.getByText('Độ mạnh: Rất an toàn')).toBeTruthy();
    expect(screen.getByText('Khớp')).toBeTruthy();

    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Đăng ký tài khoản'));

    expect(signUp).toHaveBeenCalledWith({
      email: 'nam@example.com',
      password: 'Abcd1234!',
      options: { data: { full_name: 'Nam' }, emailRedirectTo: 'mywallet://auth-callback?flow=confirm' },
    });
    expect(await screen.findByText(/Đã gửi email xác nhận tới nam@example.com/)).toBeTruthy();
  });

  it('explains server failures instead of a generic error', async () => {
    signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Database error saving new user', status: 500, code: 'unexpected_failure' },
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await render(<RegisterScreen />);
    await fill();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Đăng ký tài khoản'));
    expect(await screen.findByText(/Máy chủ đang gặp lỗi/)).toBeTruthy();
    warn.mockRestore();
  });
});
