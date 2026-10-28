export function postClassRefundClaimStudentStatusLabel(
  status: string | null | undefined,
): string | null {
  switch (status) {
    case 'under_process':
      return 'Under process';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'settled':
      return 'Settled';
    default:
      return null;
  }
}
