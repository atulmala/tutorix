export type StudentTutorSearchParams = {
  offeringId: string;
  deliveryMode: 'ANY' | 'ONLINE' | 'OFFLINE';
  classFormat: 'ANY' | 'INDIVIDUAL' | 'GROUP';
  maxRateInr?: number;
  radiusKm: number;
  sortBy: 'BEST_MATCH';
};
