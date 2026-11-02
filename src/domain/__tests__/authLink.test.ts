import { parseAuthCallback } from '../authLink';

describe('parseAuthCallback', () => {
  it('reads implicit-flow tokens from the fragment', () => {
    expect(
      parseAuthCallback('mywallet://auth-callback?flow=recovery#access_token=a.b.c&refresh_token=r1&type=recovery&expires_in=3600'),
    ).toEqual({ flow: 'recovery', accessToken: 'a.b.c', refreshToken: 'r1', code: undefined, error: undefined });
  });

  it('reads a PKCE code and the sign-up marker', () => {
    expect(parseAuthCallback('exp://192.168.1.5:8081/--/auth-callback?flow=confirm&code=xyz')).toMatchObject({
      flow: 'confirm',
      code: 'xyz',
    });
  });

  it('reports expired links', () => {
    expect(
      parseAuthCallback('mywallet://auth-callback?flow=recovery#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'),
    ).toMatchObject({ flow: 'recovery', error: 'otp_expired' });
  });

  it('ignores ordinary deep links', () => {
    expect(parseAuthCallback('mywallet://transaction?id=1')).toBeNull();
    expect(parseAuthCallback('mywallet://')).toBeNull();
  });
});
