import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADMIN_SEND_EMAIL,
  GET_ADMIN_EMAIL_STATUS,
} from '@tutorix/shared-graphql';
import { useAdminAuth } from '../auth/useAdminAuth';

type AdminEmailStatus = {
  provider: string;
  fromEmail: string | null;
  fromName: string;
  region: string;
  configured: boolean;
};

type AdminEmailStatusData = {
  adminEmailStatus: AdminEmailStatus;
};

export function SendEmailPage() {
  const { user } = useAdminAuth();
  const { data, loading, error } = useQuery<AdminEmailStatusData>(
    GET_ADMIN_EMAIL_STATUS,
    { fetchPolicy: 'network-only' },
  );

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('Tutorix test email');
  const [body, setBody] = useState(
    'This is a test message from the Tutorix admin console.',
  );
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [toPrefillDone, setToPrefillDone] = useState(false);

  useEffect(() => {
    if (toPrefillDone) return;
    if (user?.email) {
      setTo(user.email);
      setToPrefillDone(true);
    }
  }, [user?.email, toPrefillDone]);

  const [sendEmail, { loading: sending }] = useMutation(ADMIN_SEND_EMAIL, {
    onCompleted: (result) => {
      setErrorText(null);
      const messageId = result?.adminSendEmail?.messageId as string | null;
      const provider = data?.adminEmailStatus.provider;
      if (provider === 'console' || !messageId) {
        setSuccessText('Email logged to the API console (console provider).');
      } else {
        setSuccessText(`Email sent. Message ID: ${messageId}`);
      }
    },
    onError: (err) => {
      setSuccessText(null);
      setErrorText(err.message);
    },
  });

  const status = data?.adminEmailStatus;

  const handleSend = () => {
    setErrorText(null);
    setSuccessText(null);
    void sendEmail({
      variables: {
        input: {
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
        },
      },
    });
  };

  const canSend =
    to.trim().length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    !sending;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-primary">Test email</h1>
        <p className="mt-2 text-sm text-muted">
          Send a one-off message to verify AWS SES.
        </p>
      </header>

      {loading && <p className="text-sm text-muted">Loading email status…</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      )}

      {!loading && !error && status && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-subtle bg-white px-4 py-3">
            <p className="text-xs text-muted">Provider</p>
            <p className="mt-1 text-sm font-medium text-primary">
              {status.provider}
              {status.configured ? '' : ' (from address not set)'}
            </p>
          </div>
          <div className="rounded-xl border border-subtle bg-white px-4 py-3">
            <p className="text-xs text-muted">From</p>
            <p className="mt-1 text-sm font-medium text-primary">
              {status.fromName}
              {status.fromEmail ? ` <${status.fromEmail}>` : ' —'}
            </p>
          </div>
          <div className="rounded-xl border border-subtle bg-white px-4 py-3 sm:col-span-2">
            <p className="text-xs text-muted">Region</p>
            <p className="mt-1 text-sm font-medium text-primary">{status.region}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-5 rounded-xl border border-subtle bg-white p-6">
          <div>
            <label className="block text-sm font-medium text-primary" htmlFor="email-to">
              To
            </label>
            <input
              id="email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-subtle px-3 text-sm"
              placeholder="recipient@example.com"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium text-primary"
              htmlFor="email-subject"
            >
              Subject
            </label>
            <input
              id="email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-subtle px-3 text-sm"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium text-primary"
              htmlFor="email-body"
            >
              Message
            </label>
            <textarea
              id="email-body"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-2 w-full rounded-lg border border-subtle px-3 py-2 text-sm"
            />
          </div>

          {errorText && <p className="text-sm text-red-600">{errorText}</p>}
          {successText && <p className="text-sm text-green-700">{successText}</p>}

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      )}
    </div>
  );
}
