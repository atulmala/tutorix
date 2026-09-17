import { fireEvent, render, screen } from '@testing-library/react';
import {
  PENDING_RATE_CARD_TASK_ACTION,
  PT_PASSED_ONBOARDING_MESSAGE,
  PT_PASSED_RATE_CARD_LATER_ACTION,
  PT_PASSED_RATE_CARD_MESSAGE,
} from '@tutorix/shared-utils';
import { TutorPTResult } from './TutorPTResult';

describe('TutorPTResult', () => {
  it('keeps onboarding congratulations copy and Continue', () => {
    render(
      <TutorPTResult
        passed
        score={24}
        maxScore={30}
        attemptsUsed={1}
        isPostOnboardingPt={false}
        onContinue={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText(PT_PASSED_ONBOARDING_MESSAGE)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    expect(screen.queryByText(PT_PASSED_RATE_CARD_MESSAGE)).toBeNull();
  });

  it('advises rate card setup after a post-onboarding pass', () => {
    const onContinue = jest.fn();
    const onSetRateCard = jest.fn();
    render(
      <TutorPTResult
        passed
        score={24}
        maxScore={30}
        attemptsUsed={1}
        isPostOnboardingPt
        onContinue={onContinue}
        onSetRateCard={onSetRateCard}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText(PT_PASSED_RATE_CARD_MESSAGE)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: PENDING_RATE_CARD_TASK_ACTION }));
    fireEvent.click(screen.getByRole('button', { name: PT_PASSED_RATE_CARD_LATER_ACTION }));
    expect(onSetRateCard).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
