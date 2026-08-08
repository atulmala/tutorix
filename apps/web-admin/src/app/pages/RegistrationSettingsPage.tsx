import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADMIN_UPDATE_REGISTRATION_SETTINGS,
  GET_ADMIN_REGISTRATION_SETTINGS,
} from '@tutorix/shared-graphql';

type RegistrationSettings = {
  tutorRegistrationEnabled: boolean;
  studentRegistrationEnabled: boolean;
  disabledMessage: string;
};

type AdminRegistrationSettingsData = {
  adminRegistrationSettings: RegistrationSettings;
};

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        enabled
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-amber-100 text-amber-900'
      }`}
    >
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  );
}

export function RegistrationSettingsPage() {
  const { data, loading, error, refetch } = useQuery<AdminRegistrationSettingsData>(
    GET_ADMIN_REGISTRATION_SETTINGS,
    { fetchPolicy: 'network-only' },
  );

  const [tutorEnabled, setTutorEnabled] = useState(true);
  const [studentEnabled, setStudentEnabled] = useState(true);
  const [disabledMessage, setDisabledMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const published = data?.adminRegistrationSettings;

  useEffect(() => {
    const settings = data?.adminRegistrationSettings;
    if (!settings) return;
    setTutorEnabled(settings.tutorRegistrationEnabled);
    setStudentEnabled(settings.studentRegistrationEnabled);
    setDisabledMessage(settings.disabledMessage ?? '');
  }, [data]);

  const [updateSettings, { loading: saving }] = useMutation(
    ADMIN_UPDATE_REGISTRATION_SETTINGS,
    {
      onCompleted: () => {
        setSaved(true);
        setErrorText(null);
        void refetch();
        window.setTimeout(() => setSaved(false), 2000);
      },
      onError: (err) => {
        setErrorText(err.message);
      },
    },
  );

  const handleSave = () => {
    setErrorText(null);
    void updateSettings({
      variables: {
        input: {
          tutorRegistrationEnabled: tutorEnabled,
          studentRegistrationEnabled: studentEnabled,
          disabledMessage: disabledMessage.trim() || null,
        },
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-primary">Registration</h1>
        <p className="mt-2 text-sm text-muted">
          Enable or disable new tutor and student signups. Changes apply to mobile
          and web immediately after save.
        </p>
      </header>

      {loading && (
        <p className="text-sm text-muted">Loading registration settings…</p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      )}

      {!loading && !error && published && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-subtle bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-primary">Tutor registration</p>
              <StatusBadge enabled={published.tutorRegistrationEnabled} />
            </div>
            <p className="mt-1 text-xs text-muted">Current published status</p>
          </div>
          <div className="rounded-xl border border-subtle bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-primary">Student registration</p>
              <StatusBadge enabled={published.studentRegistrationEnabled} />
            </div>
            <p className="mt-1 text-xs text-muted">Current published status</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6 rounded-xl border border-subtle bg-white p-6">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={tutorEnabled}
              onChange={(e) => setTutorEnabled(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-primary">
                Tutor registration enabled
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                When off, the Tutor option is disabled on signup and the API rejects
                new tutor registrations.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={studentEnabled}
              onChange={(e) => setStudentEnabled(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-primary">
                Student registration enabled
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                When off, the Student option is disabled on signup and the API rejects
                new student registrations.
              </span>
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-primary">
              Message when a role is disabled
            </label>
            <textarea
              rows={3}
              value={disabledMessage}
              onChange={(e) => setDisabledMessage(e.target.value)}
              className="mt-2 w-full rounded-lg border border-subtle px-3 py-2 text-sm"
              placeholder="Shown on signup when a role is unavailable"
            />
          </div>

          {errorText && (
            <p className="text-sm text-red-600">{errorText}</p>
          )}
          {saved && (
            <p className="text-sm text-green-700">Settings saved.</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}
