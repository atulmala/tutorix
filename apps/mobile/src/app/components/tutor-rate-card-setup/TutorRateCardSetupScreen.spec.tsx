import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import {
  PENDING_RATE_CARD_TASK_MESSAGE,
  RATE_CARD_LATER_ACTION,
  RATE_CARD_LATER_WARNING,
  RATE_CARD_SETUP_REQUIRED_MESSAGE,
} from '@tutorix/shared-utils/rate-card';
import { TutorRateCardSetupScreen } from './TutorRateCardSetupScreen';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  GET_MY_TUTOR_DETAIL: {},
  GET_MY_TUTOR_PROFILE: {},
}));
jest.mock('@tutorix/shared-graphql/mutations', () => ({
  SAVE_MY_TUTOR_OFFERING_RATE_CARD: {},
}));
jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [jest.fn(), { loading: false }],
}));

function mockOfferings(offerings: unknown[]) {
  mockUseQuery.mockReturnValue({
    loading: false,
    data: { myTutorDetail: { offerings } },
  });
}

describe('TutorRateCardSetupScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockOfferings([
      {
        id: 63,
        offeringDisplayName: 'Mathematics',
        offeringFullLabel: 'CBSE • Class 12 • Mathematics',
        status: 'pt_passed',
        rateCard: null,
      },
    ]);
  });

  it('shows the required rate card copy and has no dismiss control', () => {
    const { getByText, queryByText, queryByLabelText } = render(
      <TutorRateCardSetupScreen onComplete={jest.fn()} />,
    );

    expect(getByText('Rate card')).toBeTruthy();
    expect(getByText(RATE_CARD_SETUP_REQUIRED_MESSAGE)).toBeTruthy();
    expect(getByText('Save rate card')).toBeTruthy();
    expect(queryByText('Cancel')).toBeNull();
    expect(queryByText(RATE_CARD_LATER_ACTION)).toBeNull();
    expect(queryByLabelText('Close')).toBeNull();
  });

  it('stays open for remaining offerings after one rate card is already complete', () => {
    const onComplete = jest.fn();
    mockOfferings([
      {
        id: 63,
        offeringDisplayName: 'Mathematics',
        offeringFullLabel: 'CBSE • Class 12 • Mathematics',
        status: 'pt_passed',
        rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
      },
      {
        id: 64,
        offeringDisplayName: 'Physics',
        offeringFullLabel: 'CBSE • Class 12 • Physics',
        status: 'pt_passed',
        rateCard: null,
      },
    ]);

    const { getByText } = render(<TutorRateCardSetupScreen onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();
    expect(getByText(PENDING_RATE_CARD_TASK_MESSAGE)).toBeTruthy();
    expect(getByText('CBSE • Class 12 • Physics')).toBeTruthy();
    expect(getByText(RATE_CARD_LATER_ACTION)).toBeTruthy();
  });

  it('does not ask for a second card when another class already shares the PT', () => {
    const onComplete = jest.fn();
    mockOfferings([
      {
        id: 63,
        proficiencyTestId: 70,
        offeringDisplayName: 'Mathematics',
        offeringFullLabel: 'CBSE • Class 12 • Mathematics',
        status: 'pt_passed',
        rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
      },
      {
        id: 64,
        proficiencyTestId: 70,
        offeringDisplayName: 'Mathematics',
        offeringFullLabel: 'CBSE • Class 11 • Mathematics',
        status: 'pt_passed',
        rateCard: null,
      },
    ]);

    const { queryByText } = render(
      <TutorRateCardSetupScreen onComplete={onComplete} />,
    );

    expect(onComplete).toHaveBeenCalled();
    expect(queryByText('CBSE • Class 11 • Mathematics')).toBeNull();
  });

  it('warns then returns to profile when additional rate card is deferred', () => {
    const onLater = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const actions = buttons as { text?: string; onPress?: () => void }[] | undefined;
      actions?.find((button) => button.text === 'OK')?.onPress?.();
    });
    mockOfferings([
      {
        id: 63,
        offeringDisplayName: 'Mathematics',
        offeringFullLabel: 'CBSE • Class 12 • Mathematics',
        status: 'pt_passed',
        rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
      },
      {
        id: 64,
        offeringDisplayName: 'Physics',
        offeringFullLabel: 'CBSE • Class 12 • Physics',
        status: 'pt_passed',
        rateCard: null,
      },
    ]);

    const { getByText } = render(
      <TutorRateCardSetupScreen onComplete={jest.fn()} onLater={onLater} />,
    );

    fireEvent.press(getByText(RATE_CARD_LATER_ACTION));

    expect(alertSpy).toHaveBeenCalledWith(
      'Rate card',
      RATE_CARD_LATER_WARNING,
      expect.any(Array),
    );
    expect(onLater).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('stays on the form when later is cancelled', () => {
    const onLater = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockOfferings([
      {
        id: 63,
        offeringDisplayName: 'Mathematics',
        offeringFullLabel: 'CBSE • Class 12 • Mathematics',
        status: 'pt_passed',
        rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
      },
      {
        id: 64,
        offeringDisplayName: 'Physics',
        offeringFullLabel: 'CBSE • Class 12 • Physics',
        status: 'pt_passed',
        rateCard: null,
      },
    ]);

    const { getByText } = render(
      <TutorRateCardSetupScreen onComplete={jest.fn()} onLater={onLater} />,
    );

    fireEvent.press(getByText(RATE_CARD_LATER_ACTION));

    expect(onLater).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
