import { render, screen } from '@testing-library/react-native';

import { splitToneMarks, Wordmark } from '@/components/brand';
import { useSettings } from '@/state/settings';

beforeEach(() => {
  useSettings.setState({ theme: 'light', loaded: true });
});

describe('splitToneMarks', () => {
  it('isolates vowels carrying sắc or huyền', () => {
    expect(splitToneMarks('Ví Mình')).toEqual([
      { text: 'V', toned: false },
      { text: 'í', toned: true },
      { text: ' M', toned: false },
      { text: 'ì', toned: true },
      { text: 'nh', toned: false },
    ]);
  });

  it('keeps names without those tone marks in one run', () => {
    expect(splitToneMarks('My Wallet')).toEqual([{ text: 'My Wallet', toned: false }]);
  });

  it('handles decomposed input', () => {
    expect(splitToneMarks('Ví').map((p) => p.toned)).toEqual([false, true]);
  });
});

describe('Wordmark', () => {
  it('draws each toned vowel with its bare letter on top and reads as the full name', async () => {
    await render(<Wordmark name="Ví Mình" />);
    expect(screen.getByLabelText('Ví Mình')).toBeTruthy();
    expect(screen.getByText('í')).toBeTruthy();
    expect(screen.getByText('ì')).toBeTruthy();
    expect(screen.getAllByText('ı')).toHaveLength(2);
  });
});
