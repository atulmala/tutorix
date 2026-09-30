import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { AddOfferingFlow } from './AddOfferingFlow';

const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
mockUseMutation.mockReturnValue([jest.fn(), { loading: false }]);

jest.mock('@tutorix/shared-graphql/queries', () => ({
  GET_OFFERINGS: { kind: 'offerings' },
  GET_MY_TUTOR_DETAIL: { kind: 'detail' },
  GET_PLATFORM_FEE: { kind: 'fee' },
}));

jest.mock('@tutorix/shared-graphql/mutations', () => ({
  ADD_MY_TUTOR_OFFERING: { kind: 'add' },
  CREDIT_OVERLAPPING_PT_PASS: { kind: 'credit' },
}));

jest.mock('@tutorix/shared-utils', () => ({
  ...jest.requireActual('@tutorix/shared-utils/study-areas.constants'),
  ...jest.requireActual('@tutorix/shared-utils/pt-overlap'),
  formatProficiencyTestFeeMessage: () => '',
}));

jest.mock('@apollo/client', () => ({
  useQuery: (query: unknown, options?: unknown) => mockUseQuery(query, options),
  useMutation: (mutation: unknown, options?: unknown) =>
    mockUseMutation(mutation, options),
}));

jest.mock('../tutor-onboarding/tutor-pt/TutorPT', () => ({
  TutorPT: () => null,
}));

jest.mock('../tutor-onboarding/tutor-pt/PtAlreadyClearedPrompt', () => ({
  PtAlreadyClearedPrompt: () => null,
}));

function offering(
  id: number,
  displayName: string,
  parentId: number | null,
  order = id,
) {
  return {
    id,
    name: displayName,
    displayName,
    level: parentId == null ? 0 : 3,
    order,
    parentOffering: parentId == null ? null : { id: parentId },
  };
}

const subjects = [
  'Accountancy',
  'Biology',
  'Business Studies',
  'Chemistry',
  'Computer Science',
  'Economics',
  'English',
  'Geography',
  'History',
  'Mathematics',
  'Physics',
  'Political Science',
  'Psychology',
  'Sociology',
];

const offerings = [
  offering(1, 'School Education', null),
  offering(10, 'CBSE', 1),
  offering(110, 'Class 11', 10),
  ...subjects.map((name, index) => offering(200 + index, name, 110, index)),
];

describe('AddOfferingFlow subject list', () => {
  beforeEach(() => {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query?.kind === 'offerings') {
        return { data: { offerings }, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });
  });

  it('scrolls a long subject list inside a bounded sheet', () => {
    render(
      <AddOfferingFlow
        excludeOfferingIds={[]}
        onClose={jest.fn()}
        onComplete={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('Select...'));
    fireEvent.press(screen.getByLabelText('School Education'));
    fireEvent.press(screen.getByText('Select...'));
    fireEvent.press(screen.getByLabelText('CBSE'));
    fireEvent.press(screen.getByText('Select...'));
    fireEvent.press(screen.getByLabelText('Class 11'));
    fireEvent.press(screen.getByText('Select...'));

    expect(screen.getByText('Subject')).toBeTruthy();
    expect(screen.getByLabelText('Accountancy')).toBeTruthy();
    expect(screen.getByLabelText('Sociology')).toBeTruthy();

    const lists = screen.UNSAFE_getAllByType(ScrollView);
    const subjectList = lists.find((list) => {
      const style = StyleSheetFlatten(list.props.style);
      return typeof style?.maxHeight === 'number' && style.maxHeight > 0;
    });
    expect(subjectList).toBeTruthy();
  });
});

function StyleSheetFlatten(
  style: unknown,
): { maxHeight?: number } | undefined {
  if (style == null) return undefined;
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map((item) => StyleSheetFlatten(item) ?? {}));
  }
  if (typeof style === 'object') {
    return style as { maxHeight?: number };
  }
  return undefined;
}
