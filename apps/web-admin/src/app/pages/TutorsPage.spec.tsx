import React from 'react';
import { fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  GET_ADMIN_TUTORS,
  GET_ADMIN_TUTOR_STAGE_COUNTS,
  GET_OFFERINGS,
} from '@tutorix/shared-graphql';
import { TutorsPage } from './TutorsPage';

jest.mock('@tutorix/shared-graphql', () => ({
  GET_ADMIN_TUTORS: 'GET_ADMIN_TUTORS',
  GET_ADMIN_TUTOR_STAGE_COUNTS: 'GET_ADMIN_TUTOR_STAGE_COUNTS',
  GET_OFFERINGS: 'GET_OFFERINGS',
}));

jest.mock('@apollo/client', () => {
  const actual = jest.requireActual('@apollo/client');
  return {
    ...actual,
    useQuery: jest.fn(),
  };
});

const mockUseQuery = useQuery as jest.Mock;

const offerings = [
  {
    id: 1,
    name: 'School Education',
    displayName: 'School Education',
    level: 0,
    order: 0,
    parentOffering: null,
  },
  {
    id: 2,
    name: 'CBSE',
    displayName: 'CBSE',
    level: 1,
    order: 0,
    parentOffering: { id: 1 },
  },
  {
    id: 3,
    name: 'Class 7',
    displayName: 'Class 7',
    level: 2,
    order: 0,
    parentOffering: { id: 2 },
  },
  {
    id: 4,
    name: 'Mathematics',
    displayName: 'Mathematics',
    level: 3,
    order: 0,
    parentOffering: { id: 3 },
  },
];

const passedTutor = {
  id: 7,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  mobile: '+91 9876543210',
  certificationStage: 'docs',
  daysInStage: 4,
  pendingAdminDocumentReview: false,
  testTutor: false,
};

describe('TutorsPage offering search', () => {
  beforeEach(() => {
    mockUseQuery.mockImplementation((query: unknown, options?: { variables?: { input?: { offeringId?: number } } }) => {
      if (query === GET_OFFERINGS) {
        return { data: { offerings }, loading: false, error: undefined };
      }
      if (query === GET_ADMIN_TUTOR_STAGE_COUNTS) {
        return {
          data: { adminTutorStageCounts: [] },
          loading: false,
          error: undefined,
        };
      }
      if (query === GET_ADMIN_TUTORS) {
        const offeringId = options?.variables?.input?.offeringId;
        const items = offeringId === 4 ? [passedTutor] : [];
        return {
          data: {
            adminTutors: {
              items,
              totalPages: items.length > 0 ? 1 : 0,
              totalCount: items.length,
            },
          },
          loading: false,
          error: undefined,
        };
      }
      return { data: undefined, loading: false, error: undefined };
    });
  });

  it('lists tutors who passed the proficiency test and shows their stage', () => {
    const view = render(
      <MemoryRouter>
        <TutorsPage />
      </MemoryRouter>,
    );

    fireEvent.change(view.getByLabelText('Study area'), {
      target: { value: 'SCHOOL_EDUCATION' },
    });
    fireEvent.change(view.getByLabelText('Board'), {
      target: { value: '2' },
    });
    fireEvent.change(view.getByLabelText('Class'), {
      target: { value: '3' },
    });
    fireEvent.change(view.getByLabelText('Subject'), {
      target: { value: '4' },
    });
    fireEvent.click(view.getByRole('button', { name: 'Search offering' }));

    const results = view.getByRole('table');
    expect(within(results).getByText('Ada Lovelace')).toBeTruthy();
    expect(within(results).getByText('Documents Upload')).toBeTruthy();
    expect(
      view.getByText('1 tutor passed the proficiency test for this offering.'),
    ).toBeTruthy();
    expect(
      (view.getByLabelText('Onboarding stage') as HTMLSelectElement).disabled,
    ).toBe(true);

    const tutorCalls = mockUseQuery.mock.calls.filter(
      (call) => call[0] === GET_ADMIN_TUTORS,
    );
    const lastCall = tutorCalls[tutorCalls.length - 1];
    expect(lastCall[1].variables.input).toMatchObject({
      offeringId: 4,
      certificationStage: null,
    });
  });

  it('lists tutors who finished bank setup, a rate card, and a saved calendar', () => {
    const view = render(
      <MemoryRouter>
        <TutorsPage />
      </MemoryRouter>,
    );

    fireEvent.change(view.getByLabelText('Onboarding stage'), {
      target: { value: 'readyForBooking' },
    });

    expect(view.getByText('No tutors are ready for booking.')).toBeTruthy();

    const tutorCalls = mockUseQuery.mock.calls.filter(
      (call) => call[0] === GET_ADMIN_TUTORS,
    );
    const lastCall = tutorCalls[tutorCalls.length - 1];
    expect(lastCall[1].variables.input).toMatchObject({
      certificationStage: null,
      readyForBooking: true,
    });
  });
});
