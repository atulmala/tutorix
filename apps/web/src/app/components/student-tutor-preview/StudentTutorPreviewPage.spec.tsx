import { render, screen } from '@testing-library/react';
import { TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql';
import { StudentTutorPreviewPage } from './StudentTutorPreviewPage';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  TUTOR_SEARCH_DETAIL: { kind: 'detail' },
  ADD_TO_CART: { kind: 'add' },
  MY_CART: { kind: 'cart' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [jest.fn(), { loading: false }],
}));

jest.mock('../../../lib/analytics', () => ({
  analytics: { trackTutorViewed: jest.fn() },
}));

describe('StudentTutorPreviewPage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('shows name beside the photo plus recent experience and top qualifications', () => {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === TUTOR_SEARCH_DETAIL) {
        return {
          loading: false,
          data: {
            tutorSearchDetail: {
              tutorId: '1',
              displayName: 'Anita Sharma',
              photoUrl: 'https://example.com/anita.jpg',
              city: 'Bengaluru',
              totalExperienceMonths: 30,
              hasAvailabilityThisWeek: true,
              slotsThisWeek: 3,
              recentExperiences: [
                {
                  jobTitle: 'Lead tutor',
                  employerName: 'Tutorix',
                  employerAddress: '12 MG Road, Bengaluru',
                  startDate: '2024-01-01',
                  isCurrent: true,
                },
                {
                  jobTitle: 'Math teacher',
                  employerName: 'Oak School',
                  employerAddress: 'Hills Public School, Bhopal',
                  startDate: '2020-01-01',
                  endDate: '2022-07-01',
                  isCurrent: false,
                },
              ],
              topQualifications: [
                {
                  qualificationType: 'MASTERS',
                  degreeName: 'M.Sc Mathematics',
                  gradeType: 'PERCENTAGE',
                  gradeValue: '76',
                  boardOrUniversity: 'JNU',
                },
                {
                  qualificationType: 'BACHELORS',
                  degreeName: 'B.Sc Mathematics',
                  gradeType: 'CGPA',
                  gradeValue: '8.2',
                  boardOrUniversity: 'Delhi University',
                },
              ],
              matchingOffering: {
                offeringId: '30',
                offeringLabel: 'CBSE · Class 8 · Mathematics',
                offlineEnabled: true,
                offlineRateInr: 500,
                onlineEnabled: false,
                freeDemoOffered: false,
                offlinePackSlabs: [],
                onlinePackSlabs: [],
              },
              otherOfferings: [
                {
                  offeringId: '31',
                  offeringLabel: 'CBSE · Class 8 · Science',
                  offlineEnabled: true,
                  offlineRateInr: 450,
                  onlineEnabled: false,
                  freeDemoOffered: false,
                  offlinePackSlabs: [],
                  onlinePackSlabs: [],
                },
              ],
            },
          },
        };
      }
      return { loading: false, data: null };
    });

    render(
      <StudentTutorPreviewPage tutorId="1" offeringId="30" onViewCart={jest.fn()} />,
    );

    expect(screen.getByRole('heading', { name: 'Anita Sharma' })).toBeTruthy();
    expect(screen.getByText('2 years 6 months')).toBeTruthy();
    expect(screen.getByText('Tutorix')).toBeTruthy();
    expect(screen.getByText('12 MG Road, Bengaluru')).toBeTruthy();
    expect(screen.getByText('Oak School')).toBeTruthy();
    expect(screen.getByText('Hills Public School, Bhopal')).toBeTruthy();
    expect(screen.getByText(/Masters/)).toBeTruthy();
    expect(screen.getByText('M.Sc Mathematics', { exact: false })).toBeTruthy();
    expect(screen.getByText('JNU · 76%')).toBeTruthy();
    expect(screen.getByText('Delhi University · CGPA: 8.2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeTruthy();
    expect(screen.getByText('Also teaches')).toBeTruthy();
    expect(screen.getByText('CBSE · Class 8 · Science')).toBeTruthy();
  });
});
