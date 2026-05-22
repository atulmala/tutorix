import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_ADMIN_DASHBOARD_STATS } from '@tutorix/shared-graphql';

type StatCardProps = {
  label: string;
  value: number | string;
  accent: 'tutor' | 'student';
};

const ACCENT_STYLES = {
  tutor: {
    card: 'border-sky-200/80 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100',
    bar: 'bg-sky-500',
    label: 'text-sky-900/80',
    value: 'text-sky-950',
  },
  student: {
    card: 'border-violet-200/80 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-100',
    bar: 'bg-violet-500',
    label: 'text-violet-900/80',
    value: 'text-violet-950',
  },
} as const;

function StatCard({ label, value, accent }: StatCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-sm ${styles.card}`}
    >
      <div className="flex items-center gap-4 p-5">
        <div className={`h-12 w-1 shrink-0 rounded-full ${styles.bar}`} />
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <p className={`text-lg font-semibold ${styles.label}`}>{label}</p>
          <p className={`text-3xl font-bold tabular-nums ${styles.value}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data, loading, error } = useQuery(GET_ADMIN_DASHBOARD_STATS);

  const stats = data?.adminDashboardStats;

  return (
    <div>
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-sky-50/80 to-violet-50/80 px-6 py-5">
        <h1 className="text-2xl font-semibold text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Overview of tutor and student signups across Tutorix.
        </p>
      </div>

      {loading && (
        <p className="mt-8 text-sm text-muted">Loading stats…</p>
      )}

      {error && (
        <p className="mt-8 text-sm text-red-600" role="alert">
          Could not load dashboard stats.
        </p>
      )}

      {!loading && !error && stats && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-4xl">
          <StatCard
            accent="tutor"
            label="Tutors signed up"
            value={stats.tutorSignupCount}
          />
          <StatCard
            accent="student"
            label="Students signed up"
            value={stats.studentSignupCount}
          />
        </div>
      )}
    </div>
  );
}
