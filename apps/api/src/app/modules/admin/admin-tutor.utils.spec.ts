import {
  applyAdminTutorSearchFilter,
  computeDaysInStage,
  tutorHasPendingDocumentReviewExistsClause,
  tutorReadyForBookingClause,
} from './admin-tutor.utils';
import { DocumentScreeningStatusEnum } from '../document/enums/document-screening-status.enum';

describe('computeDaysInStage', () => {
  it('returns 0 when enteredAt is missing', () => {
    expect(computeDaysInStage(undefined)).toBe(0);
    expect(computeDaysInStage(null)).toBe(0);
  });

  it('returns whole days since enteredAt', () => {
    const now = new Date('2026-05-22T12:00:00.000Z');
    const enteredAt = new Date('2026-05-17T12:00:00.000Z');
    expect(computeDaysInStage(enteredAt, now)).toBe(5);
  });

  it('never returns negative days', () => {
    const now = new Date('2026-05-22T12:00:00.000Z');
    const enteredAt = new Date('2026-05-23T12:00:00.000Z');
    expect(computeDaysInStage(enteredAt, now)).toBe(0);
  });
});

describe('tutorHasPendingDocumentReviewExistsClause', () => {
  it('checks onboarding documents with PENDING_HUMAN screening', () => {
    const clause = tutorHasPendingDocumentReviewExistsClause('tutor');

    expect(clause).toContain('document d');
    expect(clause).toContain('document_screening s');
    expect(clause).toContain(`d.tutor_id = tutor.id`);
    expect(clause).toContain(`s.status = '${DocumentScreeningStatusEnum.PENDING_HUMAN}'`);
  });
});

describe('tutorReadyForBookingClause', () => {
  it('requires a saved calendar, complete bank account, and complete rate card', () => {
    const clause = tutorReadyForBookingClause('tutor');

    expect(clause).toContain(`tutor."certificationStage" = 'complete'`);
    expect(clause).toContain('tutor.availability_configured_at IS NOT NULL');
    expect(clause).toContain('user_bank_details bank');
    expect(clause).toContain('bank.user_id = tutor.user_id');
    expect(clause).toContain("UPPER(bank.pan_number) ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'");
    expect(clause).toContain('tutor_offering_rate_card rate_card');
    expect(clause).toContain('rate_card.offline_base_rate >= 1');
    expect(clause).toContain('rate_card.online_base_rate >= 1');
  });
});

describe('applyAdminTutorSearchFilter', () => {
  it('uses TypeORM user property names for first and last name', () => {
    const andWhere = jest.fn();
    applyAdminTutorSearchFilter({ andWhere }, 'anna@gmail.com');

    expect(andWhere).toHaveBeenCalledTimes(1);
    const [clause, params] = andWhere.mock.calls[0] as [string, { term: string }];
    expect(clause).toContain('user.firstName ILIKE :term');
    expect(clause).toContain('user.lastName ILIKE :term');
    expect(clause).not.toContain('user.first_name');
    expect(clause).not.toContain('user.last_name');
    expect(params).toEqual({ term: '%anna@gmail.com%' });
  });
});
