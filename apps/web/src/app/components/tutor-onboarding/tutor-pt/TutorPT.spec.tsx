import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PT_ALREADY_CLEARED_MESSAGE } from '@tutorix/shared-utils';
import { CREDIT_OVERLAPPING_PT_PASS } from '@tutorix/shared-graphql';
import { TutorPT } from './TutorPT';

const mockUseQuery = jest.fn();
const mockMutate = jest.fn().mockResolvedValue({});
const mockUseMutation = jest.fn((..._args: unknown[]) => [mockMutate, { loading: false }]);
const mockUseLazyQuery = jest.fn((..._args: unknown[]) => [jest.fn()]);

jest.mock('@tutorix/shared-graphql', () => ({
  COMPLETE_WALLET_PURCHASE: { kind: 'completeWallet' },
  CONFIRM_WALLET_TOP_UP: { kind: 'confirmTopUp' },
  CREDIT_OVERLAPPING_PT_PASS: { kind: 'creditOverlap' },
  GET_MY_TUTOR_DETAIL: { kind: 'detail' },
  GET_MY_TUTOR_PROFILE: { kind: 'profile' },
  GET_PROFICIENCY_TEST_FOR_TAKER: { kind: 'test' },
  GET_PT_FEE_INFO: { kind: 'ptFee' },
  INITIATE_WALLET_TOP_UP: { kind: 'initiateTopUp' },
  PREPARE_WALLET_PURCHASE: { kind: 'prepareWallet' },
  SAVE_MY_TUTOR_OFFERING_RATE_CARD: { kind: 'saveRateCard' },
  SUBMIT_PROFICIENCY_TEST: { kind: 'submitPt' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useLazyQuery: (...args: unknown[]) => mockUseLazyQuery(...args),
}));

jest.mock('@tutorix/tutor-detail-ui', () => ({
  RateCardModal: () => null,
}));

jest.mock('../../wallet', () => ({
  WalletLowBalanceDialog: () => null,
}));

describe('TutorPT overlapping PT', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      loading: false,
      data: {},
      refetch: jest.fn(),
    });
    mockMutate.mockResolvedValue({});
  });

  it('prompts that the shared PT is already cleared and credits the offering', async () => {
    render(
      <TutorPT
        context="profile"
        tutorOfferingId={2}
        offeringDisplayName="CBSE Class XI Mathematics"
        tutorOfferings={[
          { id: 1, proficiencyTestId: 70, status: 'pt_passed' },
          { id: 2, proficiencyTestId: 70, status: 'pending_pt' },
        ]}
        onComplete={jest.fn()}
      />,
    );

    expect(screen.getByText(PT_ALREADY_CLEARED_MESSAGE)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        variables: { tutorOfferingId: 2 },
      });
    });
    expect(mockUseMutation).toHaveBeenCalledWith(
      CREDIT_OVERLAPPING_PT_PASS,
      expect.objectContaining({
        refetchQueries: expect.any(Array),
      }),
    );
  });
});
