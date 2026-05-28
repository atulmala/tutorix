import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql';
import { BRAND_NAME } from '../../config';

function formatDocType(type: string | undefined | null): string {
  if (!type) return 'Document';
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function screeningLabel(status: string | undefined | null): string {
  switch (status) {
    case 'PASSED_AUTOMATED':
      return 'Passed (automated)';
    case 'APPROVED_HUMAN':
      return 'Approved';
    case 'REJECTED_HUMAN':
      return 'Rejected';
    case 'PENDING_HUMAN':
      return 'Pending review';
    default:
      return status ?? '—';
  }
}

export const TutorProfilePage: React.FC = () => {
  const { data, loading, error } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });

  const tutor = data?.myTutorProfile;
  const user = tutor?.user;
  const displayName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (loading && !tutor) {
    return (
      <div className="w-full max-w-4xl rounded-2xl border border-subtle bg-white p-8 shadow-lg">
        <p className="text-sm text-muted">Loading your profile…</p>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="w-full max-w-4xl rounded-2xl border border-subtle bg-white p-8 shadow-lg">
        <p className="text-sm text-red-600">Could not load your tutor profile.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-6 rounded-2xl border border-subtle bg-white p-8 shadow-lg">
      <div>
        <h1 className="text-2xl font-bold text-primary">My tutor profile</h1>
        <p className="mt-1 text-sm text-muted">
          {BRAND_NAME} certified tutor · build and review your profile below
        </p>
      </div>

      <section className="rounded-lg border border-subtle p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Overview
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Name</dt>
            <dd className="font-medium text-primary">{displayName || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Years of experience</dt>
            <dd className="font-medium text-primary">
              {tutor.yearsOfExperience ?? '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-subtle p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Address
        </h2>
        {tutor.addresses?.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {tutor.addresses.map((addr) => (
              <li key={addr.id} className="text-primary">
                {addr.fullAddress ||
                  [addr.street, addr.city, addr.state, addr.postalCode]
                    .filter(Boolean)
                    .join(', ')}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No address on file.</p>
        )}
      </section>

      <section className="rounded-lg border border-subtle p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Qualifications
        </h2>
        {tutor.qualifications?.length ? (
          <ul className="mt-3 space-y-3 text-sm">
            {tutor.qualifications.map((q) => (
              <li key={q.id} className="border-b border-subtle pb-2 last:border-0">
                <p className="font-medium text-primary">
                  {q.degreeName || q.qualificationType} · {q.boardOrUniversity}
                </p>
                <p className="text-muted">
                  {q.yearObtained} · {q.gradeValue} ({q.gradeType})
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No qualifications listed.</p>
        )}
      </section>

      <section className="rounded-lg border border-subtle p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Experience
        </h2>
        {tutor.experiences?.length ? (
          <ul className="mt-3 space-y-3 text-sm">
            {tutor.experiences.map((exp) => (
              <li key={exp.id} className="border-b border-subtle pb-2 last:border-0">
                <p className="font-medium text-primary">{exp.jobTitle}</p>
                <p className="text-muted">
                  {exp.employerName}
                  {exp.isCurrent ? ' · Current' : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No experience listed.</p>
        )}
      </section>

      <section className="rounded-lg border border-subtle p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Offerings
        </h2>
        {tutor.tutorOfferings?.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {tutor.tutorOfferings.map((o) => (
              <li key={o.id} className="flex justify-between gap-2">
                <span className="text-primary">
                  {o.offering?.displayName || o.offering?.name || 'Offering'}
                </span>
                <span className="text-muted">{o.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No offerings selected.</p>
        )}
      </section>

      <section className="rounded-lg border border-subtle p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Documents
        </h2>
        {tutor.documents?.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {tutor.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle py-2 last:border-0"
              >
                <span className="font-medium text-primary">
                  {formatDocType(doc.documentType)}
                </span>
                <span className="text-muted">
                  {screeningLabel(doc.screening?.status)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No documents uploaded.</p>
        )}
      </section>
    </div>
  );
};
