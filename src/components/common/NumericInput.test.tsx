// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach } from 'vitest';
import { NumericInput } from './NumericInput';

afterEach(cleanup);

function Harness({ initial = null, onChange }: { initial?: number | null; onChange?: (v: number | null) => void }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <NumericInput value={value} onChange={v => { setValue(v); onChange?.(v); }} placeholder="w" />
      <button onClick={() => setValue((value ?? 0) + 2.5)}>step</button>
      <output data-testid="value">{String(value)}</output>
    </>
  );
}

describe('NumericInput', () => {
  it('lets the user type a decimal', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { getByPlaceholderText, getByTestId } = render(<Harness onChange={onChange} />);
    const input = getByPlaceholderText('w') as HTMLInputElement;

    await user.type(input, '62.5');

    expect(input.value).toBe('62.5');
    expect(getByTestId('value').textContent).toBe('62.5');
    expect(onChange).toHaveBeenLastCalledWith(62.5);
  });

  it('ignores characters that are not part of a number', async () => {
    const user = userEvent.setup();
    const { getByPlaceholderText } = render(<Harness />);
    const input = getByPlaceholderText('w') as HTMLInputElement;

    await user.type(input, '1a2-3');
    expect(input.value).toBe('123');
  });

  it('follows external value changes such as the stepper buttons', async () => {
    const user = userEvent.setup();
    const { getByPlaceholderText, getByText } = render(<Harness initial={100} />);
    const input = getByPlaceholderText('w') as HTMLInputElement;

    expect(input.value).toBe('100');
    await user.click(getByText('step'));
    expect(input.value).toBe('102.5');
  });

  it('clears to null and tidies a trailing decimal point on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { getByPlaceholderText } = render(<Harness initial={5} onChange={onChange} />);
    const input = getByPlaceholderText('w') as HTMLInputElement;

    await user.click(input);
    await user.keyboard('{Backspace}');
    expect(onChange).toHaveBeenLastCalledWith(null);

    await user.type(input, '7.');
    expect(input.value).toBe('7.');
    await user.tab();
    expect(input.value).toBe('7');
  });
});
