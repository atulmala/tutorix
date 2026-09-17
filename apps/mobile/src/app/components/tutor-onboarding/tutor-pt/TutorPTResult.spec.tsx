import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  PENDING_RATE_CARD_TASK_ACTION,
  PT_PASSED_ONBOARDING_MESSAGE,
  PT_PASSED_RATE_CARD_LATER_ACTION,
  PT_PASSED_RATE_CARD_MESSAGE,
} from '@tutorix/shared-utils/rate-card';
import { TutorPTResult } from './TutorPTResult';

describe('TutorPTResult', () => {
  it('keeps onboarding congratulations copy and Continue', () => {
    const { getByText, queryByText } = render(
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

    expect(getByText(PT_PASSED_ONBOARDING_MESSAGE)).toBeTruthy();
    expect(getByText('Continue')).toBeTruthy();
    expect(queryByText(PT_PASSED_RATE_CARD_MESSAGE)).toBeNull();
  });

  it('advises rate card setup after a post-onboarding pass', () => {
    const onContinue = jest.fn();
    const onSetRateCard = jest.fn();
    const { getByText, getByLabelText } = render(
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

    expect(getByText(PT_PASSED_RATE_CARD_MESSAGE)).toBeTruthy();
    fireEvent.press(getByLabelText(PENDING_RATE_CARD_TASK_ACTION));
    fireEvent.press(getByText(PT_PASSED_RATE_CARD_LATER_ACTION));
    expect(onSetRateCard).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
