import { fireEvent, render, screen } from '@testing-library/react';
import { TUTOR_BOOKABLE_SLOTS, TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql';
import { StudentTutorBookingPage } from './StudentTutorBookingPage';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  TUTOR_SEARCH_DETAIL: { kind: 'detail' },
  TUTOR_BOOKABLE_SLOTS: { kind: 'slots' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe('StudentTutorBookingPage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('lists 1-hour chips and continues with the selected slot', () => {
    const startsAt = new Date().toISOString();
    const onContinue = jest.fn();
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === TUTOR_SEARCH_DETAIL) {
        return {
          loading: false,
          data: {
            tutorSearchDetail: {
              displayName: 'Anita Sharma',
              matchingOffering: {
                offeringLabel: 'CBSE · Class 8 · Mathematics',
                offlineEnabled: true,
                onlineEnabled: false,
              },
            },
          },
        };
      }
      if (query === TUTOR_BOOKABLE_SLOTS) {
        return {
          loading: false,
          data: {
            tutorBookableSlots: [
              { tutorCalendarId: '11', startsAt, seatsLeft: 1, batchSize: 1 },
            ],
          },
        };
      }
      return { loading: false, data: null };
    });

    render(
      <StudentTutorBookingPage tutorId="3" offeringId="30" onContinue={onContinue} />,
    );

    expect(screen.getByText('Book a class')).toBeTruthy();
    expect(screen.getByText('Offline')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /AM|PM/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalledWith({
      tutorId: '3',
      offeringId: '30',
      tutorCalendarId: '11',
      deliveryMode: 'offline',
      startsAt,
    });
  });

  it('shows dates disabled until Online or Offline is chosen', () => {
    const startsAt = new Date().toISOString();
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === TUTOR_SEARCH_DETAIL) {
        return {
          loading: false,
          data: {
            tutorSearchDetail: {
              displayName: 'Anita Sharma',
              matchingOffering: {
                offeringLabel: 'Maths',
                offlineEnabled: true,
                onlineEnabled: true,
              },
            },
          },
        };
      }
      return {
        loading: false,
        data: {
          tutorBookableSlots: [
            { tutorCalendarId: '11', startsAt, seatsLeft: 1, batchSize: 1 },
          ],
        },
      };
    });

    render(<StudentTutorBookingPage tutorId="3" offeringId="30" onContinue={jest.fn()} />);

    expect(screen.getByText('Choose Online or Offline to see 1-hour slots.')).toBeTruthy();
    const dateButton = screen.getByRole('button', { name: /^(MON|TUE|WED|THU|FRI|SAT|SUN) / });
    expect(dateButton).toHaveProperty('disabled', true);
    fireEvent.click(dateButton);
    expect(dateButton.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Offline' }));
    expect(
      screen.getByRole('button', { name: /^(MON|TUE|WED|THU|FRI|SAT|SUN) / }),
    ).toHaveProperty('disabled', false);
  });

  it('shows an empty day when there are no open slots', () => {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === TUTOR_SEARCH_DETAIL) {
        return {
          loading: false,
          data: {
            tutorSearchDetail: {
              displayName: 'Anita Sharma',
              matchingOffering: {
                offeringLabel: 'Maths',
                offlineEnabled: true,
                onlineEnabled: false,
              },
            },
          },
        };
      }
      return { loading: false, data: { tutorBookableSlots: [] } };
    });

    render(
      <StudentTutorBookingPage tutorId="3" offeringId="30" onContinue={jest.fn()} />,
    );

    expect(screen.getByText('No open 1-hour slots.')).toBeTruthy();
  });

  it('shows only dates that have open slots and keeps the confirm selection', () => {
    const startsAt = new Date().toISOString();
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === TUTOR_SEARCH_DETAIL) {
        return {
          loading: false,
          data: {
            tutorSearchDetail: {
              displayName: 'Anita Sharma',
              matchingOffering: {
                offeringLabel: 'Maths',
                offlineEnabled: true,
                onlineEnabled: false,
              },
            },
          },
        };
      }
      if (query === TUTOR_BOOKABLE_SLOTS) {
        return {
          loading: false,
          data: {
            tutorBookableSlots: [
              { tutorCalendarId: '11', startsAt, seatsLeft: 1, batchSize: 1 },
            ],
          },
        };
      }
      return { loading: false, data: null };
    });

    const onContinue = jest.fn();
    render(
      <StudentTutorBookingPage
        tutorId="3"
        offeringId="30"
        draft={{
          tutorId: '3',
          offeringId: '30',
          tutorCalendarId: '11',
          deliveryMode: 'offline',
          startsAt,
        }}
        onContinue={onContinue}
      />,
    );

    expect(screen.getAllByRole('button', { name: /^(MON|TUE|WED|THU|FRI|SAT|SUN) / })).toHaveLength(
      1,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalledWith({
      tutorId: '3',
      offeringId: '30',
      tutorCalendarId: '11',
      deliveryMode: 'offline',
      startsAt,
    });
  });
});
