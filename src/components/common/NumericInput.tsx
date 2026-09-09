import { useRef, useState } from 'react';
import './NumericInput.css';

interface NumericInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

// Digits with at most one decimal point. Rejects everything else so a stray
// character never wipes the field.
const NUMERIC_PATTERN = /^\d*\.?\d*$/;

function toText(value: number | null): string {
  return value == null ? '' : String(value);
}

function parse(text: string): number | null {
  if (text === '' || text === '.') return null;
  const num = parseFloat(text);
  return Number.isFinite(num) ? num : null;
}

/**
 * Controlled numeric input that keeps the raw text the user is typing.
 * Holding the string locally is what lets "62." survive long enough to
 * become "62.5" — pushing the parsed number straight back into the input
 * would drop the trailing decimal point on every keystroke.
 */
export function NumericInput({ value, onChange, placeholder, className = '', onFocus, onBlur }: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // `emitted` is the last number handed to the parent. When the prop diverges
  // from it the change came from outside (stepper, carry-forward, rep chip),
  // so the text must follow the prop rather than the other way round. This is
  // React's "adjust state during render" pattern rather than an effect.
  const [local, setLocal] = useState(() => ({ text: toText(value), emitted: value }));
  if (value !== local.emitted) {
    setLocal({ text: toText(value), emitted: value });
  }
  const text = value !== local.emitted ? toText(value) : local.text;

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className={`numeric-input ${className}`}
      value={text}
      placeholder={placeholder}
      onChange={e => {
        const raw = e.target.value;
        if (!NUMERIC_PATTERN.test(raw)) return;
        const num = parse(raw);
        setLocal({ text: raw, emitted: num });
        if (num !== local.emitted) onChange(num);
      }}
      onFocus={() => {
        inputRef.current?.select();
        onFocus?.();
      }}
      onBlur={() => {
        // Normalise "62." -> "62" once editing is done.
        setLocal(l => ({ ...l, text: toText(l.emitted) }));
        onBlur?.();
      }}
    />
  );
}
