import { fireEvent, render, screen } from '@testing-library/react';
import { GET_MY_STUDENT_PROFILE, GET_OFFERINGS, SEARCH_TUTORS } from '@tutorix/shared-graphql';
import { StudentTutorSearchPage } from './StudentTutorSearchPage';
import { clearStudentTutorSearchDraft } from './student-tutor-search-draft';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  GET_MY_STUDENT_PROFILE: { kind: 'profile' },
  GET_OFFERINGS: { kind: 'offerings' },
  SEARCH_TUTORS: { kind: 'search' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../../../lib/analytics', () => ({
  analytics: { trackTutorSearch: jest.fn(), trackTutorViewed: jest.fn() },
}));

const offerings = [
  { id: 1, name: 'School Education', displayName: 'School Education', level: 0, order: 1, parentOffering: null },
  { id: 10, displayName: 'CBSE', level: 1, order: 1, parentOffering: { id: 1 }, rootOffering: { id: 1 } },
  { id: 11, displayName: 'ICSE', level: 1, order: 2, parentOffering: { id: 1 }, rootOffering: { id: 1 } },
  { id: 20, displayName: 'Class 8', level: 2, order: 8, parentOffering: { id: 10 }, rootOffering: { id: 1 } },
  { id: 30, displayName: 'Mathematics', level: 3, order: 1, parentOffering: { id: 20 }, rootOffering: { id: 1 } },
  { id: 31, displayName: 'Science', level: 3, order: 2, parentOffering: { id: 20 }, rootOffering: { id: 1 } },
];

function mockQueries() {
  mockUseQuery.mockImplementation((query: { kind?: string }) => {
    if (query === GET_MY_STUDENT_PROFILE) {
      return {
        loading: false,
        data: {
          myStudentProfile: {
            studentType: 'SCHOOL',
            board: 'CBSE',
            schoolClass: 8,
            boardOther: null,
          },
        },
      };
    }
    if (query === GET_OFFERINGS) {
      return { loading: false, data: { offerings } };
    }
    if (query === SEARCH_TUTORS) {
      return { loading: false, data: { searchTutors: { items: [], forcedOnlineOnly: false } } };
    }
    return { loading: false, data: null };
  });
}

describe('StudentTutorSearchPage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockQueries();
    clearStudentTutorSearchDraft();
  });

  it('shows labeled dropdowns instead of unlabeled filter chips', () => {
    render(<StudentTutorSearchPage onOpenTutorPreview={jest.fn()} />);

    expect(screen.getByLabelText('Study area')).toBeTruthy();
    expect(screen.getByLabelText('Board')).toBeTruthy();
    expect(screen.getByLabelText('Class')).toBeTruthy();
    expect(screen.getByLabelText('Subject')).toBeTruthy();
    expect(screen.getByText('Study Mode')).toBeTruthy();
    expect(screen.getByText('Group Preference')).toBeTruthy();
    expect(screen.getByLabelText('Distance')).toBeTruthy();
    expect(screen.getByLabelText('Budget')).toBeTruthy();
    expect(screen.queryByText('Choose a subject')).toBeNull();
    expect(screen.queryByText('Any class')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Both' })).toBeNull();
  });

  it('defaults board and class from the student profile and waits for a subject', () => {
    render(<StudentTutorSearchPage onOpenTutorPreview={jest.fn()} />);

    expect((screen.getByLabelText('Board') as HTMLSelectElement).value).toBe('10');
    expect((screen.getByLabelText('Class') as HTMLSelectElement).value).toBe('20');
    expect((screen.getByLabelText('Subject') as HTMLSelectElement).value).toBe('');
    expect(screen.getByText('Choose a subject to see certified tutors.')).toBeTruthy();
  });

  it('searches after a subject is chosen and keeps filters labeled', () => {
    render(<StudentTutorSearchPage onOpenTutorPreview={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Offline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Individual' }));

    expect(screen.getByRole('button', { name: 'Offline' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Individual' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    const searchCalls = mockUseQuery.mock.calls.filter((call) => call[0] === SEARCH_TUTORS);
    const searchCall = searchCalls[searchCalls.length - 1];
    expect(searchCall?.[1]?.skip).toBe(false);
    expect(searchCall?.[1]?.variables?.input).toMatchObject({
      offeringId: '30',
      deliveryMode: 'OFFLINE',
      classFormat: 'INDIVIDUAL',
    });
  });

  it('keeps filters and continues the search after remounting', () => {
    const { unmount } = render(<StudentTutorSearchPage onOpenTutorPreview={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: '31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Online' }));
    fireEvent.click(screen.getByRole('button', { name: 'Group' }));
    unmount();

    render(<StudentTutorSearchPage onOpenTutorPreview={jest.fn()} />);

    expect((screen.getByLabelText('Subject') as HTMLSelectElement).value).toBe('31');
    expect(screen.getByRole('button', { name: 'Online' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Group' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    const searchCalls = mockUseQuery.mock.calls.filter((call) => call[0] === SEARCH_TUTORS);
    expect(searchCalls[searchCalls.length - 1]?.[1]?.skip).toBe(false);
    expect(searchCalls[searchCalls.length - 1]?.[1]?.variables?.input).toMatchObject({
      offeringId: '31',
      deliveryMode: 'ONLINE',
      classFormat: 'GROUP',
    });
  });
});
