import { render, screen } from '@testing-library/react';
import { STUDENT_BOOKED_CLASS_SESSIONS } from '@tutorix/shared-graphql';
import { StudentConcludedClassesPage } from './StudentConcludedClassesPage';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  STUDENT_BOOKED_CLASS_SESSIONS: { kind: 'booked' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe('StudentConcludedClassesPage', () => {
  it('lists every concluded class with date, time, subject, and tutor', () => {
    const ended = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const upcoming = new Date(Date.now() + 3 * 60 * 60 * 1000);
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === STUDENT_BOOKED_CLASS_SESSIONS) {
        return {
          loading: false,
          data: {
            studentBookedClassSessions: [
              {
                enrollmentId: '38',
                startsAt: ended.toISOString(),
                durationMinutes: 60,
                offeringLabel: 'CBSE Class 12 Economics',
                tutorName: 'Navya',
              },
              {
                enrollmentId: '40',
                startsAt: upcoming.toISOString(),
                durationMinutes: 60,
                offeringLabel: 'Physics',
                tutorName: 'Amit',
              },
            ],
          },
        };
      }
      return { loading: false, data: null };
    });

    render(<StudentConcludedClassesPage />);

    expect(screen.getByText('CBSE Class 12 Economics')).toBeTruthy();
    expect(screen.getByText('Tutor · Navya')).toBeTruthy();
    expect(screen.queryByText('Physics')).toBeNull();
  });
});
