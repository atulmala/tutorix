import React, { useMemo, useState } from 'react';
import {
  buildStudentOnboardingTimeline,
  formatDate,
  profilePictureAvatarUrl,
  SCHOOL_BOARD_OPTIONS,
  STUDENT_ONBOARDING_STEPS,
  STUDENT_TYPE_OPTIONS,
} from '@tutorix/shared-utils';
import {
  AddressModal,
  OnboardingTimeline,
  type AddressFormValues,
  type AddressLocationSuggestion,
  type AddressPlacePrediction,
} from '@tutorix/tutor-detail-ui';
import { EducationModal } from './EducationModal';
import { ParentModal } from './ParentModal';
import type {
  EducationFormValues,
  ParentFormValues,
  StudentDetailAddress,
  StudentDetailRecord,
} from './types';

export type StudentDetailViewMode = 'admin' | 'student';

export type StudentDetailViewProps = {
  student: StudentDetailRecord;
  mode?: StudentDetailViewMode;
  headerAddon?: React.ReactNode;
  profileAvatar?: React.ReactNode;
  onSaveParent?: (values: ParentFormValues) => void | Promise<void>;
  savingParent?: boolean;
  parentSaveError?: string | null;
  onSaveAddress?: (values: AddressFormValues) => void | Promise<void>;
  savingAddress?: boolean;
  addressSaveError?: string | null;
  addressAutocomplete?: {
    ready: boolean;
    error?: string | null;
    getPredictions: (input: string) => Promise<AddressPlacePrediction[]>;
    getPlaceDetails: (placeId: string) => Promise<AddressLocationSuggestion | null>;
  };
  onSaveEducation?: (values: EducationFormValues) => void | Promise<void>;
  savingEducation?: boolean;
  educationSaveError?: string | null;
};

const SECTION_STYLES = {
  parent: {
    border: 'border-rose-200/90',
    shadow: 'shadow-rose-100/40',
    header: 'border-rose-100 bg-gradient-to-r from-rose-100 via-rose-50 to-white',
    headerText: 'text-rose-900',
    bar: 'bg-rose-500',
    body: 'bg-gradient-to-b from-rose-50/30 to-white',
    item: 'border-rose-100/80 bg-white/70',
  },
  address: {
    border: 'border-cyan-200/90',
    shadow: 'shadow-cyan-100/40',
    header: 'border-cyan-100 bg-gradient-to-r from-cyan-100 via-cyan-50 to-white',
    headerText: 'text-cyan-900',
    bar: 'bg-cyan-500',
    body: 'bg-gradient-to-b from-cyan-50/30 to-white',
    item: 'border-cyan-100/80 bg-white/70',
  },
  education: {
    border: 'border-amber-200/90',
    shadow: 'shadow-amber-100/40',
    header: 'border-amber-100 bg-gradient-to-r from-amber-100 via-amber-50 to-white',
    headerText: 'text-amber-900',
    bar: 'bg-amber-500',
    body: 'bg-gradient-to-b from-amber-50/30 to-white',
    item: 'border-amber-100/80 bg-white/70',
  },
} as const;

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
      className={`overflow-hidden rounded-2xl border shadow-md ${styles.border} ${styles.shadow}`}
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
          <div className="shrink-0 text-xs font-semibold normal-case tracking-normal text-muted">
            {headerMeta}
          </div>
        ) : null}
      </div>
      <div className={`p-5 ${styles.body}`}>{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/80 bg-white/60 px-3 py-2.5 text-sm">
      <dt className="font-medium text-muted">{label}</dt>
      <dd className="font-semibold text-primary">{value}</dd>
    </div>
  );
}

function formatStudentName(firstName?: string | null, lastName?: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || 'Student';
}

function formatMobile(user?: StudentDetailRecord['user']): string {
  if (!user) return '—';
  if (user.mobile?.trim()) return user.mobile;
  const combined = [user.mobileCountryCode, user.mobileNumber].filter(Boolean).join('');
  return combined || '—';
}

function formatAddress(address: StudentDetailAddress): string {
  if (address.fullAddress?.trim()) return address.fullAddress;
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

function ReadOnlyProfileAvatar({ avatarUrl }: { avatarUrl: string | null }) {
  return (
    <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-subtle bg-gray-100">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center px-2 text-center text-sm font-semibold text-primary/60">
          no photo
        </span>
      )}
    </div>
  );
}

function getStageTitle(student: StudentDetailRecord): string {
  if (student.onBoardingComplete) return 'Onboarding complete';
  const step = STUDENT_ONBOARDING_STEPS.find((s) => s.id === student.onboardingStage);
  return step?.title ?? student.onboardingStage ?? '—';
}

function formatParentRelation(value?: string | null): string {
  if (!value) return '—';
  if (value === 'FATHER') return 'Father';
  if (value === 'MOTHER') return 'Mother';
  return value;
}

function formatStudentType(value?: string | null): string {
  if (!value) return '—';
  return STUDENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function formatBoard(student: StudentDetailRecord): string {
  if (!student.board) return '—';
  if (student.board === 'OTHER' && student.boardOther?.trim()) {
    return student.boardOther;
  }
  return SCHOOL_BOARD_OPTIONS.find((o) => o.value === student.board)?.label ?? student.board;
}

function EditSectionButton({
  label,
  onClick,
  colorClass,
}: {
  label: string;
  onClick: () => void;
  colorClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${colorClass}`}
    >
      {label}
    </button>
  );
}

export function StudentDetailView({
  student,
  mode = 'admin',
  headerAddon,
  profileAvatar,
  onSaveParent,
  savingParent = false,
  parentSaveError = null,
  onSaveAddress,
  savingAddress = false,
  addressSaveError = null,
  addressAutocomplete,
  onSaveEducation,
  savingEducation = false,
  educationSaveError = null,
}: StudentDetailViewProps) {
  const isAdmin = mode === 'admin';
  const canEditParent = !isAdmin && Boolean(onSaveParent);
  const canEditAddress = !isAdmin && Boolean(onSaveAddress);
  const canEditEducation = !isAdmin && Boolean(onSaveEducation);

  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [educationModalOpen, setEducationModalOpen] = useState(false);

  const avatarUrl = profilePictureAvatarUrl(student.user);
  const primaryAddress =
    student.addresses.find((a) => a.primary) ?? student.addresses[0] ?? null;

  const timelineEntries = useMemo(
    () =>
      buildStudentOnboardingTimeline({
        onboardingStage: student.onboardingStage,
        onBoardingComplete: student.onBoardingComplete,
        parentRelation: student.parentRelation,
        parentName: student.parentName,
        addresses: student.addresses,
      }),
    [student],
  );

  const hasParent = Boolean(student.parentRelation && student.parentName?.trim());

  const headerAvatar =
    profileAvatar ??
    (isAdmin ? <ReadOnlyProfileAvatar avatarUrl={avatarUrl} /> : null);

  const handleSaveParent = async (values: ParentFormValues) => {
    if (!onSaveParent) return;
    await onSaveParent(values);
    setParentModalOpen(false);
  };

  const handleSaveAddress = async (values: AddressFormValues) => {
    if (!onSaveAddress) return;
    await onSaveAddress(values);
    setAddressModalOpen(false);
  };

  const handleSaveEducation = async (values: EducationFormValues) => {
    if (!onSaveEducation) return;
    await onSaveEducation(values);
    setEducationModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-sky-100/80 via-white to-violet-100/80 px-6 py-5 shadow-md shadow-sky-100/30">
        <div className={headerAvatar ? 'flex items-center gap-5' : undefined}>
          {headerAvatar ? <div className="shrink-0">{headerAvatar}</div> : null}
          <div className={headerAvatar ? 'min-w-0 flex-1' : undefined}>
            {headerAddon}
            <div className={`flex flex-wrap items-center gap-3 ${headerAddon ? 'mt-4' : ''}`}>
              <h1 className="text-2xl font-bold text-primary">
                {formatStudentName(student.user?.firstName, student.user?.lastName)}
              </h1>
              <span className="rounded-full bg-sky-500 px-3 py-0.5 text-sm font-bold text-white shadow-sm">
                #{student.id}
              </span>
              <span className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                {getStageTitle(student)}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {formatMobile(student.user)}
              {student.user?.email ? ` · ${student.user.email}` : ''}
              {student.user?.createdDate
                ? ` · Registered ${formatDate(student.user.createdDate)}`
                : ''}
            </p>
          </div>
        </div>
      </div>

      <SectionCard
        title="Parent / Guardian"
        styleKey="parent"
        headerMeta={
          canEditParent ? (
            <EditSectionButton
              label={hasParent ? 'Edit parent' : 'Enter parent'}
              onClick={() => setParentModalOpen(true)}
              colorClass="bg-violet-600 hover:bg-violet-700"
            />
          ) : hasParent ? (
            'Entered'
          ) : (
            'Not entered'
          )
        }
      >
        {!hasParent ? (
          <p className="text-sm text-rose-800/70">No parent or guardian details on file.</p>
        ) : (
          <div className="space-y-2">
            <DetailRow label="Relation" value={formatParentRelation(student.parentRelation)} />
            <DetailRow label="Name" value={student.parentName} />
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Address"
        styleKey="address"
        headerMeta={
          canEditAddress ? (
            <EditSectionButton
              label={primaryAddress ? 'Edit address' : 'Enter address'}
              onClick={() => setAddressModalOpen(true)}
              colorClass="bg-cyan-600 hover:bg-cyan-700"
            />
          ) : primaryAddress ? (
            '1 address'
          ) : (
            'No address'
          )
        }
      >
        {!primaryAddress ? (
          <p className="text-sm text-cyan-800/70">No address on file.</p>
        ) : (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium text-primary ${SECTION_STYLES.address.item}`}
          >
            {formatAddress(primaryAddress)}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Education"
        styleKey="education"
        headerMeta={
          canEditEducation ? (
            <EditSectionButton
              label="Edit education"
              onClick={() => setEducationModalOpen(true)}
              colorClass="bg-amber-600 hover:bg-amber-700"
            />
          ) : student.onBoardingComplete ? (
            'Complete'
          ) : (
            'In progress'
          )
        }
      >
        <div className="space-y-2">
          <DetailRow label="Student type" value={formatStudentType(student.studentType)} />
          <DetailRow
            label="Class"
            value={student.schoolClass != null ? String(student.schoolClass) : '—'}
          />
          <DetailRow label="Board" value={formatBoard(student)} />
        </div>
      </SectionCard>

      <OnboardingTimeline entries={timelineEntries} />

      {onSaveParent ? (
        <ParentModal
          open={parentModalOpen}
          initialValues={student}
          saving={savingParent}
          error={parentSaveError}
          onClose={() => setParentModalOpen(false)}
          onSubmit={(values: ParentFormValues) => void handleSaveParent(values)}
        />
      ) : null}

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

      {onSaveEducation ? (
        <EducationModal
          open={educationModalOpen}
          initialValues={student}
          saving={savingEducation}
          error={educationSaveError}
          onClose={() => setEducationModalOpen(false)}
          onSubmit={(values) => void handleSaveEducation(values)}
        />
      ) : null}
    </div>
  );
}
