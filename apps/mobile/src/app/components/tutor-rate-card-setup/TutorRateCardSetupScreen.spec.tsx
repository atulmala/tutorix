import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import {
  PENDING_RATE_CARD_TASK_MESSAGE,
  RATE_CARD_LATER_ACTION,
  RATE_CARD_LATER_WARNING,
  RATE_CARD_SETUP_REQUIRED_MESSAGE,
} from '@tutorix/shared-utils/rate-card';
import { RateCardModal } from '../tutor-profile/RateCardModal';
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

  it('offers a bulk discount and still saves when the tutor skips it', () => {
    const onSubmit = jest.fn();
    const screen = render(<RateCardModal visible offeringName="Mathematics" onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getAllByPlaceholderText('500')[0], '500');
    fireEvent.press(screen.getByText('Save rate card'));

    expect(
      screen.getByText(
        'Offering a discount on bulk classes enhances your chances of bulk booking',
      ),
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Yes, I want to offer a discount'));
    expect(
      screen.queryByText(
        'Offering a discount on bulk classes enhances your chances of bulk booking',
      ),
    ).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Save rate card'));
    fireEvent.press(screen.getByText('Continue without a discount'));
    fireEvent.press(screen.getByText('I want to conduct offline class only'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        offlineEnabled: true,
        offlineBaseRate: 500,
        offlineSlab2DiscountPct: null,
        offlineSlab3DiscountPct: null,
      }),
    );
  });

  it('offers to set the skipped mode or save a single-mode rate card', () => {
    const onSubmit = jest.fn();
    const screen = render(<RateCardModal visible offeringName="Mathematics" onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getAllByPlaceholderText('500')[0], '500');
    fireEvent.press(screen.getByText('Save rate card'));
    fireEvent.press(screen.getByText('Continue without a discount'));

    expect(screen.getByText('You have not set the rate card for online class')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Yes, I want to set rate card for online class'));

    expect(screen.getByRole('tab', { name: 'Online classes' }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByRole('switch', { name: 'Offer online class' }).props.value).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('saves only the configured mode when the tutor chooses to conduct that class only', () => {
    const onSubmit = jest.fn();
    const screen = render(<RateCardModal visible offeringName="Mathematics" onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getAllByPlaceholderText('500')[0], '500');
    fireEvent.press(screen.getByText('Save rate card'));
    fireEvent.press(screen.getByText('Continue without a discount'));
    fireEvent.press(screen.getByText('I want to conduct offline class only'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ offlineEnabled: true, onlineEnabled: false, offlineBaseRate: 500 }),
    );
  });
});
