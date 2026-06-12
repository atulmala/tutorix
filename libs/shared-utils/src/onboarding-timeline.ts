import {
  ONBOARDING_STEPS,
  normalizeCertificationStage,
  type OnboardingStepId,
} from './onboarding-types';

type Timestamped = {
  createdDate?: string | null;
  updatedDate?: string | null;
};

export type OnboardingTimelineStatus =
  | 'completed'
  | 'current'
  | 'pending'
  | 'skipped';

export type OnboardingTimelineEntry = {
  id: OnboardingStepId | string;
  title: string;
  completedAt: string | null;
  status: OnboardingTimelineStatus;
};

export type OnboardingTimelineInput = {
  certificationStage?: string | null;
  regFeePaid: boolean;
  regFeeDate?: string | null;
  addresses: Timestamped[];
  qualifications: Timestamped[];
  experiences: Timestamped[];
  offerings: Array<{
    createdDate?: string | null;
    passedAt?: string | null;
  }>;
  documents: Array<{ createdDate?: string | null }>;
};

function maxTimestamp(values: Array<string | null | undefined>): string | null {
  let latest: number | null = null;

  for (const value of values) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) continue;
    if (latest == null || time > latest) {
      latest = time;
    }
  }

  return latest != null ? new Date(latest).toISOString() : null;
}

function latestEntityTimestamp(items: Timestamped[]): string | null {
  if (items.length === 0) return null;
  return maxTimestamp(items.flatMap((item) => [item.updatedDate, item.createdDate]));
}

function stepIndex(stage: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((step) => step.id === stage);
}

function resolveStatus(
  stepId: OnboardingStepId,
  currentStage: OnboardingStepId | undefined,
  completedAt: string | null,
  skipped = false,
): OnboardingTimelineStatus {
  if (skipped) return 'skipped';
  if (completedAt) return 'completed';

  const stepIdx = stepIndex(stepId);
  const currentIdx = currentStage != null ? stepIndex(currentStage) : -1;
  if (currentIdx > stepIdx) return 'completed';
  if (currentStage === stepId) return 'current';
  return 'pending';
}

export function buildOnboardingTimeline(
  input: OnboardingTimelineInput,
): OnboardingTimelineEntry[] {
  const currentStage = normalizeCertificationStage(input.certificationStage ?? undefined);
  const currentIndex = currentStage != null ? stepIndex(currentStage) : -1;
  const regPaymentIndex = stepIndex('registrationPayment');
  const isPastRegPayment =
    currentIndex > regPaymentIndex || currentStage === 'complete';

  const stageTimestamps: Partial<Record<OnboardingStepId, string | null>> = {
    address: latestEntityTimestamp(input.addresses),
    qualification: latestEntityTimestamp(input.qualifications),
    experience: latestEntityTimestamp(input.experiences),
    offerings: maxTimestamp(input.offerings.map((o) => o.createdDate)),
    pt: maxTimestamp(input.offerings.map((o) => o.passedAt)),
    registrationPayment:
      input.regFeePaid && input.regFeeDate ? input.regFeeDate : null,
    docs: maxTimestamp(input.documents.map((d) => d.createdDate)),
    interview: null,
    complete: null,
  };

  const registrationSkipped =
    isPastRegPayment && !input.regFeePaid && !stageTimestamps.registrationPayment;

  return ONBOARDING_STEPS.filter((step) => step.id !== 'complete').map((step) => {
    const completedAt = stageTimestamps[step.id] ?? null;
    const skipped = step.id === 'registrationPayment' && registrationSkipped;

    return {
      id: step.id,
      title: step.title,
      completedAt,
      status: resolveStatus(step.id, currentStage, completedAt, skipped),
    };
  });
}
