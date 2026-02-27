import { useRef } from 'react';
import './NumericInput.css';

interface NumericInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
}

export function NumericInput({ value, onChange, placeholder, className = '' }: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className={`numeric-input ${className}`}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={e => {
        const raw = e.target.value;
        if (raw === '') {
          onChange(null);
          return;
        }
        const num = parseFloat(raw);
        if (!isNaN(num)) {
          onChange(num);
        }
      }}
      onFocus={() => {
        inputRef.current?.select();
      }}
    />
  );
}
