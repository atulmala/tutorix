import React, { useMemo, useState } from 'react';
import { istMondayWeekDays } from '@tutorix/shared-utils';

export const TutorHomePage: React.FC = () => {
  const weekDays = useMemo(() => istMondayWeekDays(), []);
  const todayKey = weekDays.find((d) => d.isToday)?.key ?? weekDays[0]?.key;
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const selected = weekDays.find((d) => d.key === selectedKey) ?? weekDays[0];

  return (
    <div className="w-full max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-extrabold text-[#143055]">My schedule</h1>
        <span className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-sm font-semibold text-[#2563eb]">
          This week
        </span>
      </div>

      <div className="flex gap-1 rounded-[18px] bg-white p-2">
        {weekDays.map((day) => {
          const on = day.key === selected?.key;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelectedKey(day.key)}
              aria-pressed={on}
              className={`flex flex-1 flex-col items-center rounded-xl py-2 ${
                on ? 'bg-[#2563eb] text-white' : 'text-[#143055]'
              }`}
            >
              <span
                className={`text-[10px] font-bold tracking-wide ${
                  on ? 'text-white' : 'text-slate-400'
                }`}
              >
                {day.abbr}
              </span>
              <span className="mt-1 text-base font-extrabold">{day.day}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex items-center gap-2.5 rounded-2xl bg-white p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-[#2563eb]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 3v3M17 3v3M4.5 8h15M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Today's classes</p>
            <p className="text-[15px] font-extrabold text-[#143055]">0 classes</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-white p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 8v4.5L15 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Teaching hours</p>
            <p className="text-[15px] font-extrabold text-[#143055]">0 hours</p>
          </div>
        </div>
      </div>

      <section className="rounded-[20px] bg-white p-5">
        <h2 className="text-base font-extrabold text-[#143055]">No classes on this day</h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          When students book you, upcoming sessions will appear here, with time, subject,
          and a start action when it is time to begin.
        </p>
      </section>

      <section className="rounded-[20px] bg-white p-5">
        <h2 className="text-base font-extrabold text-[#143055]">Concluded classes</h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          Sessions you finish will be listed here so you can look back on them.
        </p>
      </section>
    </div>
  );
};
