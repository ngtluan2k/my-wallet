import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { PinPad } from '@/components/PinPad';

function Harness({ onComplete, disabled }: { onComplete(v: string): void; disabled?: boolean }) {
  const [value, setValue] = useState('');
  return <PinPad value={value} onChange={setValue} onComplete={onComplete} disabled={disabled} />;
}

const press = (label: string) => fireEvent.press(screen.getByLabelText(label));

describe('PinPad', () => {
  it('completes after four digits and supports backspace', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    await press('1');
    await press('2');
    expect(screen.getByLabelText('2/4')).toBeTruthy();
    await press('⌫');
    expect(screen.getByLabelText('1/4')).toBeTruthy();
    await press('3');
    await press('4');
    await press('5');
    expect(onComplete).toHaveBeenCalledWith('1345');
  });

  it('ignores digits while disabled', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} disabled />);
    for (const d of ['1', '2', '3', '4']) await press(d);
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('0/4')).toBeTruthy();
  });
});
