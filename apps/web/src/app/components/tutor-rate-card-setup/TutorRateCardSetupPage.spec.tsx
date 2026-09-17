import { fireEvent, render, screen } from '@testing-library/react';
import {
  PENDING_RATE_CARD_TASK_MESSAGE,
  RATE_CARD_LATER_ACTION,
  RATE_CARD_LATER_WARNING,
  RATE_CARD_SETUP_REQUIRED_MESSAGE,
} from '@tutorix/shared-utils';
import { TutorRateCardSetupPage } from './TutorRateCardSetupPage';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  GET_MY_TUTOR_DETAIL: {},
  GET_MY_TUTOR_PROFILE: {},
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

describe('TutorRateCardSetupPage', () => {
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
    render(<TutorRateCardSetupPage onComplete={jest.fn()} />);

    expect(screen.getByText('Rate card')).toBeTruthy();
    expect(screen.getByText(RATE_CARD_SETUP_REQUIRED_MESSAGE)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save rate card' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(screen.queryByRole('button', { name: RATE_CARD_LATER_ACTION })).toBeNull();
    expect(screen.queryByLabelText('Close')).toBeNull();
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

    render(<TutorRateCardSetupPage onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByText(PENDING_RATE_CARD_TASK_MESSAGE)).toBeTruthy();
    expect(screen.getByText('CBSE • Class 12 • Physics')).toBeTruthy();
    expect(screen.getByRole('button', { name: RATE_CARD_LATER_ACTION })).toBeTruthy();
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

    render(<TutorRateCardSetupPage onComplete={onComplete} />);

    expect(onComplete).toHaveBeenCalled();
    expect(screen.queryByText('CBSE • Class 11 • Mathematics')).toBeNull();
  });

  it('warns then returns to profile when additional rate card is deferred', () => {
    const onLater = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
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

    render(<TutorRateCardSetupPage onComplete={jest.fn()} onLater={onLater} />);
    fireEvent.click(screen.getByRole('button', { name: RATE_CARD_LATER_ACTION }));

    expect(confirmSpy).toHaveBeenCalledWith(RATE_CARD_LATER_WARNING);
    expect(onLater).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('stays on the form when later is cancelled', () => {
    const onLater = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
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

    render(<TutorRateCardSetupPage onComplete={jest.fn()} onLater={onLater} />);
    fireEvent.click(screen.getByRole('button', { name: RATE_CARD_LATER_ACTION }));

    expect(onLater).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
