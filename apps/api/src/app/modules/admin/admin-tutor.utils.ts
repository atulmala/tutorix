import type { Repository } from 'typeorm';
import { ONBOARDING_DOCUMENT_TYPES } from '../document/onboarding-document-types';
import { DocumentScreeningStatusEnum } from '../document/enums/document-screening-status.enum';
import { TutorCertificationStageEnum } from '../tutor/enums/tutor.enums';
import type { Tutor } from '../tutor/entities/tutor.entity';

const MS_PER_DAY = 86_400_000;

export function computeDaysInStage(
  enteredAt: Date | null | undefined,
  now: Date = new Date(),
): number {
  if (!enteredAt) {
    return 0;
  }
  const ms = now.getTime() - new Date(enteredAt).getTime();
  return Math.max(0, Math.floor(ms / MS_PER_DAY));
}

export function applyAdminTutorSearchFilter(
  qb: { andWhere: (clause: string, params: Record<string, string>) => void },
  search: string | undefined,
): void {
  const trimmed = search?.trim();
  if (!trimmed) {
    return;
  }
  const term = `%${trimmed}%`;
  qb.andWhere(
    `(user.email ILIKE :term OR user.mobile ILIKE :term OR user.mobile_number ILIKE :term OR user.first_name ILIKE :term OR user.last_name ILIKE :term OR CONCAT(COALESCE(user.first_name, ''), ' ', COALESCE(user.last_name, '')) ILIKE :term)`,
    { term },
  );
}

export function tutorHasPendingDocumentReviewExistsClause(
  tutorAlias = 'tutor',
): string {
  const types = ONBOARDING_DOCUMENT_TYPES.join(',');
  return `EXISTS (
    SELECT 1 FROM document d
    INNER JOIN document_screening s ON s.document_id = d.id
    WHERE d.tutor_id = ${tutorAlias}.id
      AND d.deleted = false
      AND s.status = '${DocumentScreeningStatusEnum.PENDING_HUMAN}'
      AND d.document_type IN (${types})
  )`;
}

export async function findTutorIdsWithPendingDocumentReview(
  tutorRepo: Repository<Tutor>,
  tutorIds: number[],
): Promise<Set<number>> {
  if (tutorIds.length === 0) {
    return new Set();
  }

  const rows = await tutorRepo.manager
    .createQueryBuilder()
    .select('DISTINCT d.tutor_id', 'tutorId')
    .from('document', 'd')
    .innerJoin('document_screening', 's', 's.document_id = d.id')
    .where('d.tutor_id IN (:...tutorIds)', { tutorIds })
    .andWhere('d.deleted = :deleted', { deleted: false })
    .andWhere('s.status = :status', {
      status: DocumentScreeningStatusEnum.PENDING_HUMAN,
    })
    .andWhere('d.document_type IN (:...types)', {
      types: [...ONBOARDING_DOCUMENT_TYPES],
    })
    .getRawMany<{ tutorId: string | number }>();

  return new Set(rows.map((row) => Number(row.tutorId)));
}

export async function countDocsStageTutorsPendingDocumentReview(
  tutorRepo: Repository<Tutor>,
  search?: string,
): Promise<number> {
  const qb = tutorRepo
    .createQueryBuilder('tutor')
    .innerJoin('tutor.user', 'user')
    .where('tutor.deleted = :deleted', { deleted: false })
    .andWhere('tutor.certificationStage = :stage', {
      stage: TutorCertificationStageEnum.docs,
    })
    .andWhere(tutorHasPendingDocumentReviewExistsClause());

  applyAdminTutorSearchFilter(qb, search);

  return qb.getCount();
}
