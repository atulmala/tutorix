import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { GET_MY_STUDENT_PROFILE, GET_OFFERINGS } from '@tutorix/shared-graphql/queries';
import { StudentTutorSearchScreen } from './StudentTutorSearchScreen';
import {
  clearStudentTutorSearchDraft,
  writeStudentTutorSearchDraft,
} from './student-tutor-search-draft';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  GET_MY_STUDENT_PROFILE: { kind: 'profile' },
  GET_OFFERINGS: { kind: 'offerings' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

const offerings = [
  {
    id: 1,
    name: 'School Education',
    displayName: 'School Education',
    level: 0,
    order: 1,
    parentOffering: null,
  },
  {
    id: 10,
    displayName: 'CBSE',
    level: 1,
    order: 1,
    parentOffering: { id: 1 },
    rootOffering: { id: 1 },
  },
  { id: 20, displayName: 'Class 8', level: 2, order: 8, parentOffering: { id: 10 } },
  { id: 30, displayName: 'Mathematics', level: 3, order: 1, parentOffering: { id: 20 } },
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
    return { loading: false, data: null };
  });
}

describe('StudentTutorSearchScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockQueries();
    clearStudentTutorSearchDraft();
  });

  it('defaults study area, board, and class from school onboarding', () => {
    const { getByLabelText } = render(<StudentTutorSearchScreen onSearch={jest.fn()} />);

    expect(getByLabelText('Study area')).toHaveTextContent(/School Education/);
    expect(getByLabelText('Board')).toHaveTextContent(/CBSE/);
    expect(getByLabelText('Class')).toHaveTextContent(/Class 8/);
    expect(getByLabelText('Subject')).toHaveTextContent(/Select subject/);
  });

  it('applies school onboarding defaults even if an empty search draft was saved', () => {
    writeStudentTutorSearchDraft({
      studyArea: 'SCHOOL_EDUCATION',
      selectedIds: [],
      deliveryMode: 'ANY',
      classFormat: 'ANY',
      maxRateText: '',
      radiusKm: 10,
    });
    const { getByLabelText } = render(<StudentTutorSearchScreen onSearch={jest.fn()} />);

    expect(getByLabelText('Study area')).toHaveTextContent(/School Education/);
    expect(getByLabelText('Board')).toHaveTextContent(/CBSE/);
    expect(getByLabelText('Class')).toHaveTextContent(/Class 8/);
  });

  it('keeps Search disabled until a subject is chosen and does not query tutors', () => {
    const onSearch = jest.fn();
    const { getByLabelText, getByText } = render(
      <StudentTutorSearchScreen onSearch={onSearch} />,
    );

    expect(getByText('Choose a subject to search for certified tutors.')).toBeTruthy();
    expect(getByLabelText('Search').props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(getByLabelText('Search'));
    expect(onSearch).not.toHaveBeenCalled();
    expect(mockUseQuery.mock.calls.some((call) => call[0]?.kind === 'search')).toBe(false);
  });

  it('opens searched tutors when Search is pressed after a subject is chosen', () => {
    const onSearch = jest.fn();
    const { getByLabelText } = render(<StudentTutorSearchScreen onSearch={onSearch} />);

    fireEvent.press(getByLabelText('Subject'));
    fireEvent.press(getByLabelText('Mathematics'));
    fireEvent.press(getByLabelText('Offline'));
    fireEvent.press(getByLabelText('Search'));

    expect(onSearch).toHaveBeenCalledWith({
      offeringId: '30',
      deliveryMode: 'OFFLINE',
      classFormat: 'ANY',
      maxRateInr: undefined,
      radiusKm: 10,
      sortBy: 'BEST_MATCH',
    });
  });
});
