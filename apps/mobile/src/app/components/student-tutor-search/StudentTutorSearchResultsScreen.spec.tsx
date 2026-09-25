import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SEARCH_TUTORS } from '@tutorix/shared-graphql/queries';
import { StudentTutorSearchResultsScreen } from './StudentTutorSearchResultsScreen';
import type { StudentTutorSearchParams } from './student-tutor-search-params';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  SEARCH_TUTORS: { kind: 'search' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../../../lib/analytics', () => ({
  analytics: { trackTutorSearch: jest.fn(), trackTutorViewed: jest.fn() },
}));

const searchParams: StudentTutorSearchParams = {
  offeringId: '30',
  deliveryMode: 'OFFLINE',
  classFormat: 'ANY',
  radiusKm: 10,
  sortBy: 'BEST_MATCH',
};

const hit = {
  tutorId: '99',
  displayName: 'Anita Sharma',
  offeringLabel: 'CBSE · Class 8 · Mathematics',
  matchingOfferingId: '30',
  rateInr: 500,
  deliveryModeShown: 'OFFLINE',
  distanceKm: 2.4,
  freeDemoOffered: true,
  hasAvailabilityThisWeek: true,
  groupSize: 1,
};

describe('StudentTutorSearchResultsScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('shows a loading state while tutors are fetched', () => {
    mockUseQuery.mockReturnValue({ loading: true, data: null });
    const { getByText } = render(
      <StudentTutorSearchResultsScreen
        searchParams={searchParams}
        onOpenTutorPreview={jest.fn()}
        onRefineSearch={jest.fn()}
      />,
    );

    expect(getByText('Finding tutors…')).toBeTruthy();
    expect(mockUseQuery).toHaveBeenCalledWith(SEARCH_TUTORS, {
      variables: { input: searchParams },
      fetchPolicy: 'network-only',
    });
  });

  it('shows an empty state and can include online tutors', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { searchTutors: { items: [], forcedOnlineOnly: false } },
    });
    const onRefineSearch = jest.fn();
    const { getByText, getByLabelText } = render(
      <StudentTutorSearchResultsScreen
        searchParams={searchParams}
        onOpenTutorPreview={jest.fn()}
        onRefineSearch={onRefineSearch}
      />,
    );

    expect(getByText('No tutors match these filters yet.')).toBeTruthy();
    fireEvent.press(getByLabelText('Include online tutors'));
    expect(onRefineSearch).toHaveBeenCalledWith({
      ...searchParams,
      deliveryMode: 'ANY',
    });
  });

  it('opens a tutor preview from a result card', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: { searchTutors: { items: [hit], forcedOnlineOnly: false } },
    });
    const onOpenTutorPreview = jest.fn();
    const { getByText, getByLabelText } = render(
      <StudentTutorSearchResultsScreen
        searchParams={searchParams}
        onOpenTutorPreview={onOpenTutorPreview}
        onRefineSearch={jest.fn()}
      />,
    );

    expect(getByText('1 certified tutor')).toBeTruthy();
    expect(getByText('Anita Sharma')).toBeTruthy();
    fireEvent.press(getByLabelText('View profile Anita Sharma'));
    expect(onOpenTutorPreview).toHaveBeenCalledWith('99', '30');
  });
});
