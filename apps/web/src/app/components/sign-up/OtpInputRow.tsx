import React, { useEffect, useRef } from 'react';

type OtpInputRowProps = {
  value: string;
  length?: number;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
};

export const OtpInputRow: React.FC<OtpInputRowProps> = ({
  value,
  length = 6,
  disabled = false,
  error,
  onChange,
}) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current = refs.current.slice(0, length);
  }, [length]);

  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, '').slice(-1);
    const chars = value.split('');
    chars[index] = digit;
    const next = chars.join('').slice(0, length);
    onChange(next);
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-[9px]">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[idx] ?? ''}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          disabled={disabled}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          className={`h-10 w-10 rounded-md border ${
            error
              ? 'border-danger'
              : !disabled && value ? 'border-[#9ab0d8]' : 'border-subtle'
          } bg-white text-center text-lg font-semibold text-primary shadow-sm focus:border-primary focus:outline-none ${
            disabled ? 'opacity-60' : ''
          }`}
        />
      ))}
    </div>
  );
};

