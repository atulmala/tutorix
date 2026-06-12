import {
  STUDENT_ONBOARDING_STEPS,
  normalizeStudentOnboardingStage,
  type StudentOnboardingStepId,
} from './student-onboarding-types';
import type {
  OnboardingTimelineEntry,
  OnboardingTimelineStatus,
} from './onboarding-timeline';

type Timestamped = {
  createdDate?: string | null;
  updatedDate?: string | null;
};

export type StudentOnboardingTimelineInput = {
  onboardingStage?: string | null;
  onBoardingComplete: boolean;
  parentRelation?: string | null;
  parentName?: string | null;
  addresses: Timestamped[];
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

function stepIndex(stage: StudentOnboardingStepId): number {
  return STUDENT_ONBOARDING_STEPS.findIndex((step) => step.id === stage);
}

function isStepDataComplete(
  stepId: StudentOnboardingStepId,
  input: StudentOnboardingTimelineInput,
): boolean {
  switch (stepId) {
    case 'parent':
      return Boolean(input.parentRelation && input.parentName?.trim());
    case 'address':
      return input.addresses.length > 0;
    case 'education':
      return input.onBoardingComplete;
    default:
      return false;
  }
}

function resolveStatus(
  stepId: StudentOnboardingStepId,
  currentStage: StudentOnboardingStepId | undefined,
  input: StudentOnboardingTimelineInput,
): OnboardingTimelineStatus {
  if (input.onBoardingComplete) return 'completed';

  const stepIdx = stepIndex(stepId);
  const currentIdx = currentStage != null ? stepIndex(currentStage) : -1;

  if (currentIdx > stepIdx && isStepDataComplete(stepId, input)) return 'completed';
  if (currentStage === stepId) return 'current';
  if (currentIdx > stepIdx) return 'completed';
  if (isStepDataComplete(stepId, input) && currentIdx === -1) return 'completed';
  return 'pending';
}

function completedAtForStep(
  stepId: StudentOnboardingStepId,
  input: StudentOnboardingTimelineInput,
  status: OnboardingTimelineStatus,
): string | null {
  if (status === 'pending' || status === 'current') return null;
  if (stepId === 'address') return latestEntityTimestamp(input.addresses);
  return null;
}

export function buildStudentOnboardingTimeline(
  input: StudentOnboardingTimelineInput,
): OnboardingTimelineEntry[] {
  const currentStage = normalizeStudentOnboardingStage(input.onboardingStage);

  const steps: OnboardingTimelineEntry[] = STUDENT_ONBOARDING_STEPS.map((step) => {
    const status = resolveStatus(step.id, currentStage, input);
    return {
      id: step.id,
      title: step.title,
      completedAt: completedAtForStep(step.id, input, status),
      status,
    };
  });

  steps.push({
    id: 'complete',
    title: 'Onboarding complete',
    completedAt: input.onBoardingComplete ? maxTimestamp(steps.map((s) => s.completedAt)) : null,
    status: input.onBoardingComplete ? 'completed' : 'pending',
  });

  return steps;
}
