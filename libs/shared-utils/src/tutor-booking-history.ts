export type TutorBookingSchedulingStatus =
  | 'unscheduled'
  | 'scheduled'
  | 'partial'
  | 'cancelled';

export type TutorBookingConclusionStatus = 'not_concluded' | 'partial' | 'concluded';

export function tutorBookingSchedulingLabel(row: {
  schedulingStatus: string;
  scheduledCount: number;
  classCount: number;
}): string {
  if (row.schedulingStatus === 'partial') {
    return `${row.scheduledCount} of ${row.classCount} scheduled`;
  }
  if (row.schedulingStatus === 'scheduled') {
    return 'Scheduled';
  }
  if (row.schedulingStatus === 'cancelled') {
    return 'Cancelled';
  }
  return 'Unscheduled';
}

export function tutorBookingConclusionLabel(row: {
  conclusionStatus?: string | null;
  concludedCount: number;
  classCount: number;
}): string {
  if (!row.conclusionStatus) {
    return '—';
  }
  if (row.conclusionStatus === 'partial') {
    return `${row.concludedCount} of ${row.classCount} concluded`;
  }
  if (row.conclusionStatus === 'concluded') {
    return 'Concluded';
  }
  return 'Not concluded';
}

export function tutorBookingModeLabel(mode: string): string {
  return mode === 'online' ? 'Online' : 'Offline';
}

export function formatTutorBookingAmount(amountInr: number): string {
  return `₹${amountInr}`;
}
