import React, { useEffect, useMemo, useState } from 'react';
import {
  EXPERIENCE_MIN_YEAR,
  EXPERIENCE_MONTH_SHORT_LABELS,
  isExperienceMonthInFuture,
  parseExperienceMonthYear,
  toExperienceMonthDate,
} from '@tutorix/shared-utils';

const MONTH_FULL_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

type MonthYearPickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  minValue?: string;
  monthId?: string;
  yearId?: string;
  monthAriaLabel?: string;
  yearAriaLabel?: string;
};

function isBeforeMin(year: number, month: number, minValue?: string): boolean {
  const min = parseExperienceMonthYear(minValue);
  if (!min) return false;
  if (year < min.year) return true;
  if (year > min.year) return false;
  return month < min.month;
}

function isMonthUnavailable(
  year: number | '',
  month: number,
  now: Date,
  minValue?: string,
): boolean {
  if (year === '') return false;
  return (
    isExperienceMonthInFuture(year, month, now) || isBeforeMin(year, month, minValue)
  );
}

function latestValidMonth(
  year: number,
  now: Date,
  minValue?: string,
): number | '' {
  for (let month = 12; month >= 1; month -= 1) {
    if (!isMonthUnavailable(year, month, now, minValue)) {
      return month;
    }
  }
  return '';
}

export function MonthYearPickerField({
  value,
  onChange,
  disabled = false,
  hasError = false,
  minValue,
  monthId,
  yearId,
  monthAriaLabel = 'Month',
  yearAriaLabel = 'Year',
}: MonthYearPickerFieldProps) {
  const parsed = parseExperienceMonthYear(value);
  const [draftMonth, setDraftMonth] = useState<number | ''>(parsed?.month ?? '');
  const [draftYear, setDraftYear] = useState<number | ''>(parsed?.year ?? '');
  const now = new Date();
  const currentYear = now.getFullYear();

  useEffect(() => {
    const next = parseExperienceMonthYear(value);
    setDraftMonth(next?.month ?? '');
    setDraftYear(next?.year ?? '');
  }, [value]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = currentYear; year >= EXPERIENCE_MIN_YEAR; year -= 1) {
      list.push(year);
    }
    return list;
  }, [currentYear]);

  const selectCls = `h-11 rounded-md border bg-white px-2.5 text-sm text-primary shadow-sm focus:outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 ${
    hasError ? 'border-danger' : 'border-subtle'
  }`;

  const emit = (month: number | '', year: number | '') => {
    if (month === '' || year === '') {
      if (value) onChange('');
      return;
    }
    if (isMonthUnavailable(year, month, now, minValue)) {
      return;
    }
    onChange(toExperienceMonthDate(year, month));
  };

  const handleMonthChange = (nextMonth: number | '') => {
    setDraftMonth(nextMonth);
    emit(nextMonth, draftYear);
  };

  const handleYearChange = (nextYear: number | '') => {
    setDraftYear(nextYear);
    if (nextYear === '') {
      emit('', nextYear);
      return;
    }
    let nextMonth = draftMonth;
    if (nextMonth !== '' && isMonthUnavailable(nextYear, nextMonth, now, minValue)) {
      nextMonth = latestValidMonth(nextYear, now, minValue);
      setDraftMonth(nextMonth);
    }
    emit(nextMonth, nextYear);
  };

  return (
    <div className="flex items-end gap-2">
      <div className="w-[9.25rem]">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Month
        </span>
        <select
          id={monthId}
          aria-label={monthAriaLabel}
          value={draftMonth === '' ? '' : String(draftMonth)}
          onChange={(e) =>
            handleMonthChange(e.target.value === '' ? '' : Number(e.target.value))
          }
          disabled={disabled}
          className={`${selectCls} w-full`}
        >
          <option value="">Month</option>
          {EXPERIENCE_MONTH_SHORT_LABELS.map((shortLabel, index) => {
            const month = index + 1;
            return (
              <option
                key={shortLabel}
                value={month}
                disabled={isMonthUnavailable(draftYear, month, now, minValue)}
              >
                {MONTH_FULL_LABELS[index]}
              </option>
            );
          })}
        </select>
      </div>
      <span
        className="flex h-11 shrink-0 items-center text-lg font-semibold text-muted"
        aria-hidden
      >
        /
      </span>
      <div className="w-[5.75rem]">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Year
        </span>
        <select
          id={yearId}
          aria-label={yearAriaLabel}
          value={draftYear === '' ? '' : String(draftYear)}
          onChange={(e) =>
            handleYearChange(e.target.value === '' ? '' : Number(e.target.value))
          }
          disabled={disabled}
          className={`${selectCls} w-full`}
        >
          <option value="">Year</option>
          {years.map((year) => {
            const min = parseExperienceMonthYear(minValue);
            const yearDisabled = Boolean(min && year < min.year);
            return (
              <option key={year} value={year} disabled={yearDisabled}>
                {year}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
