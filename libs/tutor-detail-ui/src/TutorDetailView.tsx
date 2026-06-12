import React, { useMemo, useState } from 'react';
import {
  buildOnboardingTimeline,
  canDeleteQualificationType,
  documentStatusBadgeClass,
  documentStatusLabel,
  EDUCATIONAL_QUALIFICATION_LABELS,
  EducationalQualification,
  emptyExperienceRow,
  emptyQualificationRow,
  experienceDurationMonths,
  formatDate,
  formatExperienceDuration,
  formatQualificationTitle,
  getAvailableQualificationTypes,
  mapExperienceToFormRow,
  mapQualificationToFormRow,
  monthsToExperienceDuration,
  ptStatusBadgeClass,
  ptStatusLabel,
  sortTutorOfferingsForDisplay,
  sortQualificationsHighestFirst,
  sumExperienceDurations,
  BANK_DETAILS_REQUIRED_FOR_RATE_CARD_MESSAGE,
  tutorHasAtLeastOneCompleteRateCard,
} from '@tutorix/shared-utils';
import { OfferingLabel } from './OfferingLabel';
import { OnboardingTimeline } from './OnboardingTimeline';
import { AdminDocumentViewerModal } from './AdminDocumentViewerModal';
import { TutorDocumentViewerModal } from './TutorDocumentViewerModal';
import { BankDetailsSection } from './BankDetailsSection';
import { BankDetailsModal, type BankDetailsFormValues } from './BankDetailsModal';
import {
  AddressModal,
  type AddressFormValues,
  type AddressLocationSuggestion,
  type AddressPlacePrediction,
} from './AddressModal';
import { ExperienceModal, type ExperienceFormRow } from './ExperienceModal';
import { QualificationModal, type QualificationFormRow } from './QualificationModal';
import { RateCardModal, type RateCardFormValuesExport } from './RateCardModal';
import { TutorAvailabilitySection } from '@tutorix/tutor-availability-ui';
import type { TutorDetailRecord, TutorDocumentDetail } from './types';

export type { BankDetailsFormValues } from './BankDetailsModal';
export type { AddressFormValues } from './AddressModal';
export type { ExperienceFormRow } from './ExperienceModal';
export type { QualificationFormRow } from './QualificationModal';
export type { RateCardFormValuesExport as RateCardFormValues } from './RateCardModal';

export type TutorDetailViewMode = 'admin' | 'tutor';

export type TutorDetailViewProps = {
  mode: TutorDetailViewMode;
  tutor: TutorDetailRecord;
  headerAddon?: React.ReactNode;
  profileAvatar?: React.ReactNode;
  onTestTutorChange?: (testTutor: boolean) => void;
  savingTestTutor?: boolean;
  onDocumentReviewComplete?: () => void;
  onSaveBankDetails?: (values: BankDetailsFormValues) => void | Promise<void>;
  savingBankDetails?: boolean;
  bankDetailsSaveError?: string | null;
  onSaveAddress?: (values: AddressFormValues) => void | Promise<void>;
  savingAddress?: boolean;
  addressSaveError?: string | null;
  addressAutocomplete?: {
    ready: boolean;
    error?: string | null;
    getPredictions: (input: string) => Promise<AddressPlacePrediction[]>;
    getPlaceDetails: (placeId: string) => Promise<AddressLocationSuggestion | null>;
  };
  onSaveRateCard?: (
    tutorOfferingId: number,
    values: RateCardFormValuesExport,
  ) => void | Promise<void>;
  savingRateCard?: boolean;
  rateCardSaveError?: string | null;
  onAddOffering?: () => void;
  onStartProficiencyTest?: (
    offering: TutorDetailRecord['offerings'][number],
  ) => void;
  onSaveExperiences?: (experiences: ExperienceFormRow[]) => void | Promise<void>;
  savingExperiences?: boolean;
  experienceSaveError?: string | null;
  onSaveQualifications?: (rows: QualificationFormRow[]) => void | Promise<void>;
  savingQualifications?: boolean;
  qualificationSaveError?: string | null;
};

type SectionStyle = {
  border: string;
  shadow: string;
  section?: string;
  header: string;
  headerText: string;
  headerMeta?: string;
  bar: string;
  body: string;
  item: string;
  tableHeader: string;
  tableRowEven: string;
  tableRowOdd: string;
};

function formatEntryCount(count: number, singular: string, plural: string): string {
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural}`;
}

const SECTION_STYLES: Record<string, SectionStyle> = {
  fee: {
    border: 'border-amber-200/90',
    shadow: 'shadow-amber-100/40',
    header: 'bg-gradient-to-r from-amber-100 via-amber-50 to-white',
    headerText: 'text-amber-900',
    bar: 'bg-amber-500',
    body: 'bg-gradient-to-b from-amber-50/40 to-white',
    item: 'border-amber-100 bg-amber-50/50',
    tableHeader: '',
    tableRowEven: '',
    tableRowOdd: '',
  },
  address: {
    border: 'border-cyan-200/90',
    shadow: 'shadow-cyan-100/40',
    header: 'bg-gradient-to-r from-cyan-100 via-cyan-50 to-white',
    headerText: 'text-cyan-900',
    bar: 'bg-cyan-500',
    body: 'bg-gradient-to-b from-cyan-50/30 to-white',
    item: 'border-cyan-100 bg-gradient-to-r from-cyan-50/80 to-white',
    tableHeader: '',
    tableRowEven: '',
    tableRowOdd: '',
  },
  education: {
    border: 'border-indigo-200/90',
    shadow: 'shadow-indigo-100/40',
    section: 'flex h-full min-h-0 flex-col bg-white',
    header: 'shrink-0 border-b border-indigo-100 bg-white',
    headerText: 'text-indigo-900',
    headerMeta: 'text-indigo-700/80',
    bar: 'bg-indigo-500',
    body: 'flex flex-1 flex-col bg-white',
    item: 'border-indigo-100 bg-indigo-50/70',
    tableHeader: '',
    tableRowEven: '',
    tableRowOdd: '',
  },
  experience: {
    border: 'border-violet-200/90',
    shadow: 'shadow-violet-100/40',
    header: 'bg-gradient-to-r from-violet-100 via-violet-50 to-white',
    headerText: 'text-violet-900',
    headerMeta: 'text-violet-700/80',
    bar: 'bg-violet-500',
    body: 'bg-gradient-to-b from-violet-50/30 to-white',
    item: 'border-violet-100 bg-violet-50/70',
    tableHeader: '',
    tableRowEven: '',
    tableRowOdd: '',
  },
  offerings: {
    border: 'border-purple-200/90',
    shadow: 'shadow-purple-100/40',
    header: 'bg-gradient-to-r from-purple-100 via-purple-50 to-white',
    headerText: 'text-purple-900',
    headerMeta: 'text-purple-700/80',
    bar: 'bg-purple-500',
    body: 'bg-gradient-to-b from-purple-50/30 to-white',
    item: '',
    tableHeader:
      'border-purple-200 bg-gradient-to-r from-purple-100/80 to-purple-50/50 text-purple-900',
    tableRowEven: 'bg-white hover:bg-purple-50/40',
    tableRowOdd: 'bg-purple-50/30 hover:bg-purple-50/50',
  },
  documents: {
    border: 'border-emerald-200/90',
    shadow: 'shadow-emerald-100/40',
    header: 'bg-gradient-to-r from-emerald-100 via-emerald-50 to-white',
    headerText: 'text-emerald-900',
    bar: 'bg-emerald-500',
    body: 'bg-gradient-to-b from-emerald-50/30 to-white',
    item: 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/60 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-100/50',
    tableHeader: '',
    tableRowEven: '',
    tableRowOdd: '',
  },
};

function SectionCard({
  title,
  styleKey,
  headerMeta,
  children,
}: {
  title: string;
  styleKey: keyof typeof SECTION_STYLES;
  headerMeta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles = SECTION_STYLES[styleKey];

  return (
    <section
      className={`overflow-hidden rounded-2xl border shadow-md ${styles.border} ${styles.shadow} ${styles.section ?? ''}`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 ${styles.header}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className={`h-8 w-1 shrink-0 rounded-full ${styles.bar}`} aria-hidden />
          <h2 className={`text-sm font-bold uppercase tracking-wide ${styles.headerText}`}>
            {title}
          </h2>
        </div>
        {headerMeta ? (
          <div
            className={`flex shrink-0 flex-wrap items-center justify-end gap-2 ${typeof headerMeta === 'string' ? `text-xs font-semibold normal-case tracking-normal ${styles.headerMeta ?? 'text-muted'}` : ''}`}
          >
            {typeof headerMeta === 'string' ? <span>{headerMeta}</span> : headerMeta}
          </div>
        ) : null}
      </div>
      <div className={`p-5 ${styles.body}`}>{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  accentClass = 'bg-white/60',
}: {
  label: string;
  value: React.ReactNode;
  accentClass?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/80 px-3 py-2.5 text-sm ${accentClass}`}
    >
      <dt className="font-medium text-muted">{label}</dt>
      <dd className="font-semibold text-primary">{value}</dd>
    </div>
  );
}

function formatTutorName(firstName?: string | null, lastName?: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || '—';
}

function formatMobile(user?: TutorDetailRecord['user']): string {
  if (!user) return '—';
  if (user.mobile?.trim()) return user.mobile.trim();
  if (user.mobileNumber?.trim()) {
    const code = user.mobileCountryCode?.trim() || '+91';
    return `${code} ${user.mobileNumber.trim()}`;
  }
  return '—';
}

function formatAddress(address: TutorDetailRecord['addresses'][0]): string {
  if (address.fullAddress?.trim()) return address.fullAddress.trim();
  return [
    address.street,
    address.subArea,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

function OfferingsSection({
  offerings,
  mode,
  onOpenRateCard,
  onAddOffering,
  onStartProficiencyTest,
  bankDetailsComplete = true,
  onOpenBankDetails,
}: {
  offerings: TutorDetailRecord['offerings'];
  mode: TutorDetailViewMode;
  onOpenRateCard?: (offering: TutorDetailRecord['offerings'][number]) => void;
  onAddOffering?: () => void;
  onStartProficiencyTest?: (offering: TutorDetailRecord['offerings'][number]) => void;
  bankDetailsComplete?: boolean;
  onOpenBankDetails?: () => void;
}) {
  const isAdmin = mode === 'admin';
  const showRateCardColumn = isAdmin || Boolean(onOpenRateCard);

  const sortedOfferings = useMemo(
    () => sortTutorOfferingsForDisplay(offerings),
    [offerings],
  );

  const headerMeta = (
    <div className="flex flex-wrap items-center gap-2">
      <span>{formatEntryCount(offerings.length, 'offering', 'offerings')}</span>
      {!isAdmin && onAddOffering ? (
        <button
          type="button"
          onClick={onAddOffering}
          className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700"
        >
          Add offering
        </button>
      ) : null}
    </div>
  );

  return (
    <SectionCard
      title="Offerings"
      styleKey="offerings"
      headerMeta={headerMeta}
    >
      {offerings.length === 0 ? (
        <p className="text-sm text-purple-800/70">No offerings on file.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-purple-100">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr
                className={`text-xs font-bold uppercase tracking-wide ${SECTION_STYLES.offerings.tableHeader}`}
              >
                <th className="px-4 py-3">Offering</th>
                <th className="px-4 py-3">PT status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Score</th>
                {showRateCardColumn ? <th className="px-4 py-3">Rate card</th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedOfferings.map((offering, index) => {
                const hasRateCard = Boolean(offering.rateCard?.isComplete);
                const ptPassed = offering.status === 'pt_passed';
                const ptPending = offering.status === 'pending_pt';
                const canEditRateCard = ptPassed && Boolean(onOpenRateCard);
                const canStartPt = ptPending && Boolean(onStartProficiencyTest);

                return (
                  <tr
                    key={offering.id}
                    className={
                      index % 2 === 0
                        ? SECTION_STYLES.offerings.tableRowEven
                        : SECTION_STYLES.offerings.tableRowOdd
                    }
                  >
                    <td className="max-w-xs px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <OfferingLabel
                          className="line-clamp-2 font-semibold text-purple-950"
                          label={
                            offering.offeringFullLabel ??
                            offering.offeringDisplayName ??
                            offering.offeringName
                          }
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${ptStatusBadgeClass(offering.status)}`}
                      >
                        {ptStatusLabel(offering.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-purple-900/70">
                      {formatDate(offering.lastAttemptAt ?? offering.passedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {offering.lastScore != null && offering.lastMaxScore != null ? (
                        <span className="rounded-md bg-purple-100 px-2 py-0.5 font-bold text-purple-900">
                          {offering.lastScore}/{offering.lastMaxScore}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    {showRateCardColumn ? (
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-purple-900/70">
                              {hasRateCard ? 'Created' : 'Not created'}
                            </span>
                            {onOpenRateCard ? (
                              <button
                                type="button"
                                onClick={() => onOpenRateCard(offering)}
                                disabled={!hasRateCard}
                                className="rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-purple-800 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:border-purple-100 disabled:text-purple-400 disabled:hover:bg-white"
                              >
                                View rate card
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {canStartPt && onStartProficiencyTest ? (
                              <button
                                type="button"
                                onClick={() => onStartProficiencyTest(offering)}
                                className="rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-purple-800 transition hover:bg-purple-50"
                              >
                                Take proficiency test
                              </button>
                            ) : !ptPassed ? (
                              <span className="text-sm text-purple-800/70">—</span>
                            ) : hasRateCard ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                Configured
                              </span>
                            ) : null}
                            {canEditRateCard && !bankDetailsComplete ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-amber-800/90">
                                  {BANK_DETAILS_REQUIRED_FOR_RATE_CARD_MESSAGE}
                                </span>
                                {onOpenBankDetails ? (
                                  <button
                                    type="button"
                                    onClick={onOpenBankDetails}
                                    className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-50"
                                  >
                                    Enter bank details
                                  </button>
                                ) : null}
                              </div>
                            ) : canEditRateCard && onOpenRateCard ? (
                              <button
                                type="button"
                                onClick={() => onOpenRateCard(offering)}
                                className="rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-purple-800 transition hover:bg-purple-50"
                              >
                                {hasRateCard ? 'Edit rate card' : 'Rate card'}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function AddressSection({
  addresses,
  editable = false,
  onEdit,
}: {
  addresses: TutorDetailRecord['addresses'];
  editable?: boolean;
  onEdit?: () => void;
}) {
  const address = addresses[0] ?? null;

  return (
    <SectionCard
      title="Address"
      styleKey="address"
      headerMeta={
        editable && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700"
          >
            {address ? 'Edit address' : 'Enter address'}
          </button>
        ) : address ? (
          '1 address'
        ) : (
          'No address'
        )
      }
    >
      {!address ? (
        <p className="text-sm text-cyan-800/70">No address on file.</p>
      ) : (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium text-primary ${SECTION_STYLES.address.item}`}
        >
          {formatAddress(address)}
        </div>
      )}
    </SectionCard>
  );
}

function EducationSection({
  qualifications,
  editable = false,
  savingQualifications = false,
  deletingQualificationType = null,
  availableTypes = [],
  showTypePicker = false,
  onEditQualification,
  onDeleteQualification,
  onAddQualification,
  onPickQualificationType,
  onCancelTypePicker,
}: {
  qualifications: TutorDetailRecord['qualifications'];
  editable?: boolean;
  savingQualifications?: boolean;
  deletingQualificationType?: EducationalQualification | null;
  availableTypes?: EducationalQualification[];
  showTypePicker?: boolean;
  onEditQualification?: (qualificationType: EducationalQualification) => void;
  onDeleteQualification?: (qualificationType: EducationalQualification) => void;
  onAddQualification?: () => void;
  onPickQualificationType?: (type: EducationalQualification) => void;
  onCancelTypePicker?: () => void;
}) {
  const sorted = sortQualificationsHighestFirst(qualifications ?? []);

  return (
    <SectionCard
      title="Education"
      styleKey="education"
      headerMeta={formatEntryCount(sorted.length, 'qualification', 'qualifications')}
    >
      {sorted.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-indigo-800/70">No qualifications on file.</p>
          {editable && onAddQualification && availableTypes.length > 0 ? (
            <button
              type="button"
              onClick={onAddQualification}
              disabled={savingQualifications}
              className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add qualification
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {sorted.map((qual, index) => {
              const qualType = qual.qualificationType as EducationalQualification;
              const isDeleting = deletingQualificationType === qualType;
              const canDelete = canDeleteQualificationType(qualType);

              return (
                <li
                  key={qual.id}
                  className={`rounded-xl border px-4 py-3 text-sm ${SECTION_STYLES.education.item}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-indigo-950">
                          {formatQualificationTitle(qual.qualificationType, qual.degreeName)}
                        </p>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {editable && onEditQualification ? (
                            <button
                              type="button"
                              onClick={() => onEditQualification(qualType)}
                              disabled={savingQualifications}
                              aria-label="Edit qualification"
                              title="Edit qualification"
                              className="rounded-lg p-1.5 text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                          ) : null}
                          {editable && canDelete && onDeleteQualification ? (
                            <button
                              type="button"
                              onClick={() => onDeleteQualification(qualType)}
                              disabled={savingQualifications}
                              aria-label={
                                isDeleting ? 'Deleting qualification' : 'Delete qualification'
                              }
                              title={isDeleting ? 'Deleting…' : 'Delete qualification'}
                              className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDeleting ? (
                                <span className="block h-4 w-4 animate-pulse rounded bg-red-200" />
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden
                                >
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  <line x1="10" x2="10" y1="11" y2="17" />
                                  <line x1="14" x2="14" y1="11" y2="17" />
                                </svg>
                              )}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-1 text-indigo-900/70">
                        {qual.boardOrUniversity} · {qual.gradeType}: {qual.gradeValue} ·{' '}
                        {qual.yearObtained}
                      </p>
                      {qual.fieldOfStudy && (
                        <p className="mt-0.5 text-indigo-800/60">{qual.fieldOfStudy}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {editable && onAddQualification && availableTypes.length > 0 ? (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={onAddQualification}
                disabled={savingQualifications || showTypePicker}
                className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add qualification
              </button>
              {showTypePicker && onPickQualificationType && onCancelTypePicker ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <p className="text-sm font-medium text-indigo-900">Choose qualification type</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => onPickQualificationType(type)}
                        disabled={savingQualifications}
                        className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-800 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {EDUCATIONAL_QUALIFICATION_LABELS[type]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={onCancelTypePicker}
                      disabled={savingQualifications}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-700/80 transition hover:text-indigo-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}

function ExperienceSection({
  experiences,
  editable = false,
  savingExperiences = false,
  deletingExperienceId = null,
  onEditExperience,
  onDeleteExperience,
  onAddExperience,
}: {
  experiences: TutorDetailRecord['experiences'];
  editable?: boolean;
  savingExperiences?: boolean;
  deletingExperienceId?: number | null;
  onEditExperience?: (experienceId: number) => void;
  onDeleteExperience?: (experienceId: number) => void;
  onAddExperience?: () => void;
}) {
  const totalExperience = sumExperienceDurations(experiences);

  return (
    <SectionCard
      title="Experience"
      styleKey="experience"
      headerMeta={
        <>
          <span className="text-xs font-semibold normal-case tracking-normal text-violet-700/80">
            {formatEntryCount(experiences.length, 'experience', 'experiences')}
          </span>
          {experiences.length > 0 ? (
            <span className="inline-flex rounded-full bg-violet-500 px-3 py-1 text-xs font-bold text-white">
              {formatExperienceDuration(totalExperience)} total
            </span>
          ) : null}
        </>
      }
    >
      {experiences.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-violet-800/70">No experience entries on file.</p>
          {editable && onAddExperience ? (
            <button
              type="button"
              onClick={onAddExperience}
              disabled={savingExperiences}
              className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add new Experience
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {experiences.map((exp, index) => {
              const durationMonths = experienceDurationMonths(exp);
              const durationLabel =
                durationMonths != null
                  ? formatExperienceDuration(monthsToExperienceDuration(durationMonths))
                  : null;
              const isDeleting = deletingExperienceId === exp.id;

              return (
                <li
                  key={exp.id}
                  className={`rounded-xl border px-4 py-3 text-sm ${SECTION_STYLES.experience.item}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-violet-950">{exp.jobTitle}</p>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {durationLabel ? (
                            <span className="rounded-full bg-violet-200/80 px-2.5 py-0.5 text-xs font-bold text-violet-900">
                              {durationLabel}
                            </span>
                          ) : null}
                          {editable && onEditExperience ? (
                            <button
                              type="button"
                              onClick={() => onEditExperience(exp.id)}
                              disabled={savingExperiences}
                              aria-label="Edit experience"
                              title="Edit experience"
                              className="rounded-lg p-1.5 text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                          ) : null}
                          {editable && onDeleteExperience ? (
                            <button
                              type="button"
                              onClick={() => onDeleteExperience(exp.id)}
                              disabled={savingExperiences}
                              aria-label={isDeleting ? 'Deleting experience' : 'Delete experience'}
                              title={isDeleting ? 'Deleting…' : 'Delete experience'}
                              className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDeleting ? (
                                <span className="block h-4 w-4 animate-pulse rounded bg-red-200" />
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden
                                >
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  <line x1="10" x2="10" y1="11" y2="17" />
                                  <line x1="14" x2="14" y1="11" y2="17" />
                                </svg>
                              )}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-1 text-violet-900/70">
                        {exp.employerName ?? 'Self-employed'}
                        {exp.employerAddress ? ` · ${exp.employerAddress}` : ''}
                      </p>
                      <p className="mt-1 text-violet-800/60">
                        {formatDate(exp.startDate)} –{' '}
                        {exp.isCurrent ? 'Present' : formatDate(exp.endDate)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {editable && onAddExperience ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={onAddExperience}
                disabled={savingExperiences}
                className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add new Experience
              </button>
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}

export function TutorDetailView({
  mode,
  tutor,
  headerAddon,
  profileAvatar,
  onTestTutorChange,
  savingTestTutor = false,
  onDocumentReviewComplete,
  onSaveBankDetails,
  savingBankDetails = false,
  bankDetailsSaveError = null,
  onSaveAddress,
  savingAddress = false,
  addressSaveError = null,
  addressAutocomplete,
  onSaveRateCard,
  savingRateCard = false,
  rateCardSaveError = null,
  onAddOffering,
  onStartProficiencyTest,
  onSaveExperiences,
  savingExperiences = false,
  experienceSaveError = null,
  onSaveQualifications,
  savingQualifications = false,
  qualificationSaveError = null,
}: TutorDetailViewProps) {
  const [selectedDocument, setSelectedDocument] = useState<TutorDocumentDetail | null>(null);
  const [bankDetailsModalOpen, setBankDetailsModalOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [rateCardOffering, setRateCardOffering] = useState<
    TutorDetailRecord['offerings'][number] | null
  >(null);
  const [experienceModal, setExperienceModal] = useState<
    { mode: 'edit' | 'add'; experienceId?: number } | null
  >(null);
  const [deletingExperienceId, setDeletingExperienceId] = useState<number | null>(null);
  const [qualificationModal, setQualificationModal] = useState<
    { mode: 'edit' | 'add'; qualificationType: EducationalQualification } | null
  >(null);
  const [qualificationTypePickerOpen, setQualificationTypePickerOpen] = useState(false);
  const [deletingQualificationType, setDeletingQualificationType] =
    useState<EducationalQualification | null>(null);
  const isAdmin = mode === 'admin';
  const canEditExperiences = !isAdmin && Boolean(onSaveExperiences);
  const canEditQualifications = !isAdmin && Boolean(onSaveQualifications);
  const canEditAddress = !isAdmin && Boolean(onSaveAddress);
  const primaryAddress = tutor.addresses[0] ?? null;

  const experiencesAsFormRows = useMemo(
    () => tutor.experiences.map((exp) => mapExperienceToFormRow(exp)),
    [tutor.experiences],
  );

  const qualificationsAsFormRows = useMemo(
    () => (tutor.qualifications ?? []).map((qual) => mapQualificationToFormRow(qual)),
    [tutor.qualifications],
  );

  const availableQualificationTypes = useMemo(
    () =>
      getAvailableQualificationTypes(
        qualificationsAsFormRows.map((row) => row.qualificationType),
      ),
    [qualificationsAsFormRows],
  );

  const handleSaveExperiences = async (rows: ExperienceFormRow[]) => {
    if (!onSaveExperiences) return;
    await onSaveExperiences(rows);
  };

  const handleSaveAddress = async (values: AddressFormValues) => {
    if (!onSaveAddress) return;
    try {
      await onSaveAddress(values);
      setAddressModalOpen(false);
    } catch {
      /* error surfaced via addressSaveError */
    }
  };

  const handleExperienceModalSubmit = async (row: ExperienceFormRow) => {
    if (!experienceModal || !onSaveExperiences) return;
    const nextRows =
      experienceModal.mode === 'edit' && experienceModal.experienceId != null
        ? experiencesAsFormRows.map((existing) =>
            existing.id === experienceModal.experienceId
              ? { ...row, id: existing.id }
              : existing,
          )
        : [...experiencesAsFormRows, row];
    try {
      await handleSaveExperiences(nextRows);
      setExperienceModal(null);
    } catch {
      /* error surfaced via experienceSaveError */
    }
  };

  const handleDeleteExperience = async (experienceId: number) => {
    if (!onSaveExperiences) return;
    const confirmed = window.confirm(
      'Delete this experience? This cannot be undone.',
    );
    if (!confirmed) return;
    setDeletingExperienceId(experienceId);
    try {
      const nextRows = experiencesAsFormRows.filter((row) => row.id !== experienceId);
      await handleSaveExperiences(nextRows);
    } finally {
      setDeletingExperienceId(null);
    }
  };

  const experienceModalInitialRow = useMemo(() => {
    if (!experienceModal) return emptyExperienceRow();
    if (experienceModal.mode === 'edit' && experienceModal.experienceId != null) {
      return (
        experiencesAsFormRows.find((row) => row.id === experienceModal.experienceId) ??
        emptyExperienceRow()
      );
    }
    return emptyExperienceRow();
  }, [experienceModal, experiencesAsFormRows]);

  const handleSaveQualifications = async (rows: QualificationFormRow[]) => {
    if (!onSaveQualifications) return;
    await onSaveQualifications(rows);
  };

  const handleQualificationModalSubmit = async (row: QualificationFormRow) => {
    if (!qualificationModal || !onSaveQualifications) return;
    const nextRows =
      qualificationModal.mode === 'edit'
        ? qualificationsAsFormRows.map((existing) =>
            existing.qualificationType === row.qualificationType ? row : existing,
          )
        : [...qualificationsAsFormRows, row];
    try {
      await handleSaveQualifications(nextRows);
      setQualificationModal(null);
      setQualificationTypePickerOpen(false);
    } catch {
      /* error surfaced via qualificationSaveError */
    }
  };

  const handleDeleteQualification = async (qualificationType: EducationalQualification) => {
    if (!onSaveQualifications || !canDeleteQualificationType(qualificationType)) return;
    const confirmed = window.confirm(
      'Delete this qualification? This cannot be undone.',
    );
    if (!confirmed) return;
    setDeletingQualificationType(qualificationType);
    try {
      const nextRows = qualificationsAsFormRows.filter(
        (row) => row.qualificationType !== qualificationType,
      );
      await handleSaveQualifications(nextRows);
    } finally {
      setDeletingQualificationType(null);
    }
  };

  const handleAddQualification = () => {
    if (availableQualificationTypes.length === 1) {
      setQualificationModal({
        mode: 'add',
        qualificationType: availableQualificationTypes[0],
      });
      return;
    }
    setQualificationTypePickerOpen(true);
  };

  const handlePickQualificationType = (type: EducationalQualification) => {
    setQualificationTypePickerOpen(false);
    setQualificationModal({ mode: 'add', qualificationType: type });
  };

  const qualificationModalInitialRow = useMemo(() => {
    if (!qualificationModal) {
      return emptyQualificationRow(EducationalQualification.HIGHER_SECONDARY);
    }
    if (qualificationModal.mode === 'edit') {
      return (
        qualificationsAsFormRows.find(
          (row) => row.qualificationType === qualificationModal.qualificationType,
        ) ?? emptyQualificationRow(qualificationModal.qualificationType)
      );
    }
    return emptyQualificationRow(qualificationModal.qualificationType);
  }, [qualificationModal, qualificationsAsFormRows]);

  const timelineEntries = useMemo(
    () =>
      buildOnboardingTimeline({
        certificationStage: tutor.certificationStage,
        regFeePaid: tutor.regFeePaid,
        regFeeDate: tutor.regFeeDate,
        addresses: tutor.addresses,
        qualifications: tutor.qualifications,
        experiences: tutor.experiences,
        offerings: tutor.offerings,
        documents: tutor.documents,
      }),
    [tutor],
  );

  const feeAmount = tutor.regFeePaid ? tutor.regFeeAmount : tutor.regFeeAmountToBePaid;

  const showTutorCalendar = useMemo(
    () =>
      tutor.offerings.length > 0 &&
      tutorHasAtLeastOneCompleteRateCard(tutor.offerings),
    [tutor.offerings],
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-sky-100/80 via-white to-violet-100/80 px-6 py-5 shadow-md shadow-sky-100/30">
        <div className={profileAvatar ? 'flex items-center gap-5' : undefined}>
          {profileAvatar ? <div className="shrink-0">{profileAvatar}</div> : null}
          <div className={profileAvatar ? 'min-w-0 flex-1' : undefined}>
            {headerAddon}
            <div className={`flex flex-wrap items-center gap-3 ${headerAddon ? 'mt-4' : ''}`}>
              <h1 className="text-2xl font-bold text-primary">
                {formatTutorName(tutor.user?.firstName, tutor.user?.lastName)}
              </h1>
              <span className="rounded-full bg-sky-500 px-3 py-0.5 text-sm font-bold text-white shadow-sm">
                #{tutor.id}
              </span>
              {tutor.certificationStage && (
                <span className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                  {tutor.certificationStage}
                </span>
              )}
              {isAdmin && tutor.testTutor && (
                <span className="rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                  Test Tutor
                </span>
              )}
              {isAdmin && onTestTutorChange && (
                <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-amber-900 shadow-sm">
                  <input
                    type="checkbox"
                    checked={tutor.testTutor}
                    disabled={savingTestTutor}
                    onChange={(e) => onTestTutorChange(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  Test tutor
                </label>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">
              {formatMobile(tutor.user)}
              {tutor.user?.email ? ` · ${tutor.user.email}` : ''}
              {tutor.user?.createdDate
                ? ` · Registered ${formatDate(tutor.user.createdDate)}`
                : ''}
            </p>
          </div>
        </div>
      </div>

      {rateCardOffering ? (
        <RateCardModal
          open={Boolean(rateCardOffering)}
          readOnly={isAdmin}
          offeringName={
            rateCardOffering.offeringFullLabel ??
            rateCardOffering.offeringDisplayName ??
            rateCardOffering.offeringName ??
            'Offering'
          }
          initialValues={rateCardOffering.rateCard}
          saving={isAdmin ? false : savingRateCard}
          error={isAdmin ? null : rateCardSaveError}
          onClose={() => setRateCardOffering(null)}
          onSubmit={
            !isAdmin && onSaveRateCard
              ? async (values) => {
                  await onSaveRateCard(rateCardOffering.id, values);
                  setRateCardOffering(null);
                }
              : undefined
          }
        />
      ) : null}

      {!isAdmin && (
        <>
          <TutorAvailabilitySection
            canSetAvailability={tutor.canSetAvailability === true}
            offerings={tutor.offerings}
            bankDetailsComplete={Boolean(tutor.user?.bankDetails?.isComplete)}
            onOpenBankDetails={
              onSaveBankDetails ? () => setBankDetailsModalOpen(true) : undefined
            }
            onOpenRateCard={
              onSaveRateCard
                ? (offering) => {
                    if (!tutor.user?.bankDetails?.isComplete) return;
                    const full = tutor.offerings.find((o) => o.id === offering.id);
                    if (full) setRateCardOffering(full);
                  }
                : undefined
            }
          />
          <OfferingsSection
            offerings={tutor.offerings}
            mode={mode}
            onAddOffering={onAddOffering}
            onStartProficiencyTest={onStartProficiencyTest}
            bankDetailsComplete={Boolean(tutor.user?.bankDetails?.isComplete)}
            onOpenBankDetails={
              onSaveBankDetails ? () => setBankDetailsModalOpen(true) : undefined
            }
            onOpenRateCard={
              onSaveRateCard ? (offering) => setRateCardOffering(offering) : undefined
            }
          />
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
            <ExperienceSection
              experiences={tutor.experiences}
              editable={canEditExperiences}
              savingExperiences={savingExperiences}
              deletingExperienceId={deletingExperienceId}
              onEditExperience={
                canEditExperiences
                  ? (experienceId) =>
                      setExperienceModal({ mode: 'edit', experienceId })
                  : undefined
              }
              onDeleteExperience={
                canEditExperiences ? handleDeleteExperience : undefined
              }
              onAddExperience={
                canEditExperiences ? () => setExperienceModal({ mode: 'add' }) : undefined
              }
            />
            <div className="h-full min-h-0">
              <EducationSection
                qualifications={tutor.qualifications}
                editable={canEditQualifications}
                savingQualifications={savingQualifications}
                deletingQualificationType={deletingQualificationType}
                availableTypes={availableQualificationTypes}
                showTypePicker={qualificationTypePickerOpen}
                onEditQualification={
                  canEditQualifications
                    ? (qualificationType) =>
                        setQualificationModal({ mode: 'edit', qualificationType })
                    : undefined
                }
                onDeleteQualification={
                  canEditQualifications ? handleDeleteQualification : undefined
                }
                onAddQualification={
                  canEditQualifications ? handleAddQualification : undefined
                }
                onPickQualificationType={
                  canEditQualifications ? handlePickQualificationType : undefined
                }
                onCancelTypePicker={
                  canEditQualifications
                    ? () => setQualificationTypePickerOpen(false)
                    : undefined
                }
              />
            </div>
          </div>
          {canEditExperiences ? (
            <ExperienceModal
              open={Boolean(experienceModal)}
              mode={experienceModal?.mode ?? 'add'}
              initialRow={experienceModalInitialRow}
              saving={savingExperiences}
              error={experienceSaveError}
              onClose={() => setExperienceModal(null)}
              onSubmit={(row) => void handleExperienceModalSubmit(row)}
            />
          ) : null}
          {canEditQualifications ? (
            <QualificationModal
              open={Boolean(qualificationModal)}
              mode={qualificationModal?.mode ?? 'add'}
              initialRow={qualificationModalInitialRow}
              saving={savingQualifications}
              error={qualificationSaveError}
              onClose={() => {
                setQualificationModal(null);
                setQualificationTypePickerOpen(false);
              }}
              onSubmit={(row) => void handleQualificationModalSubmit(row)}
            />
          ) : null}
          <BankDetailsSection
            mode={mode}
            bankDetails={tutor.user?.bankDetails}
            onEnterOrEdit={
              onSaveBankDetails ? () => setBankDetailsModalOpen(true) : undefined
            }
          />
          {onSaveBankDetails ? (
            <BankDetailsModal
              open={bankDetailsModalOpen}
              initialValues={tutor.user?.bankDetails}
              saving={savingBankDetails}
              error={bankDetailsSaveError}
              onClose={() => setBankDetailsModalOpen(false)}
              onSubmit={async (values) => {
                await onSaveBankDetails(values);
                setBankDetailsModalOpen(false);
              }}
            />
          ) : null}
          <AddressSection
            addresses={tutor.addresses}
            editable={canEditAddress}
            onEdit={() => setAddressModalOpen(true)}
          />
          {onSaveAddress ? (
            <AddressModal
              open={addressModalOpen}
              initialValues={primaryAddress}
              saving={savingAddress}
              error={addressSaveError}
              autocomplete={addressAutocomplete}
              onClose={() => setAddressModalOpen(false)}
              onSubmit={(values) => void handleSaveAddress(values)}
            />
          ) : null}
        </>
      )}

      {isAdmin && (
        <>
          {showTutorCalendar ? (
            <TutorAvailabilitySection
              canSetAvailability={tutor.canSetAvailability === true}
              offerings={tutor.offerings}
              tutorId={tutor.id}
              readOnly
              hideWhenLocked
            />
          ) : null}
          <OfferingsSection
            offerings={tutor.offerings}
            mode={mode}
            onOpenRateCard={(offering) => setRateCardOffering(offering)}
          />
          <BankDetailsSection mode={mode} bankDetails={tutor.user?.bankDetails} />
          <AddressSection addresses={tutor.addresses} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <EducationSection qualifications={tutor.qualifications} />
            <ExperienceSection experiences={tutor.experiences} />
          </div>
        </>
      )}

      <SectionCard title="Documents" styleKey="documents">
        {tutor.documents.length === 0 ? (
          <p className="text-sm text-emerald-800/70">No onboarding documents uploaded.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {tutor.documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSelectedDocument(doc)}
                className={`rounded-xl border p-4 text-left transition ${SECTION_STYLES.documents.item}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-emerald-950">{doc.name ?? 'Document'}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${documentStatusBadgeClass(doc.screening?.status)}`}
                  >
                    {documentStatusLabel(doc.screening?.status)}
                  </span>
                </div>
                <div className="mt-3 flex h-32 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white">
                  {doc.previewUrl ? (
                    <img
                      src={doc.previewUrl}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-medium text-emerald-700/70">Click to view</span>
                  )}
                </div>
                {doc.filename && (
                  <p className="mt-2 truncate text-xs text-emerald-900/60">{doc.filename}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <OnboardingTimeline entries={timelineEntries} />

        <SectionCard title="Registration fee" styleKey="fee">
          <dl className="grid gap-2.5 text-sm">
            <DetailRow
              label="Status"
              accentClass="bg-amber-50/80"
              value={
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    tutor.regFeePaid
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tutor.regFeePaid ? 'Paid' : 'Not received'}
                </span>
              }
            />
            <DetailRow
              label="Amount"
              value={feeAmount != null ? `₹${feeAmount}` : '—'}
              accentClass="bg-amber-50/80"
            />
            <DetailRow
              label="Date received"
              value={tutor.regFeePaid ? formatDate(tutor.regFeeDate) : 'Not received'}
              accentClass="bg-amber-50/80"
            />
          </dl>
        </SectionCard>
      </div>

      {selectedDocument &&
        (isAdmin ? (
          <AdminDocumentViewerModal
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onReviewComplete={() => onDocumentReviewComplete?.()}
          />
        ) : (
          <TutorDocumentViewerModal
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
          />
        ))}
    </div>
  );
}
