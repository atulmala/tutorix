import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { Tutor } from '../tutor/entities/tutor.entity';
import { TutorCertificationStageEnum } from '../tutor/enums/tutor.enums';
import {
  applyAdminTutorSearchFilter,
  computeDaysInStage,
} from './admin-tutor.utils';
import { AdminDashboardStats } from './dto/admin-dashboard-stats.dto';
import { AdminTutorListInput } from './dto/admin-tutor-list.input';
import { AdminTutorListItem } from './dto/admin-tutor-list-item.dto';
import { AdminTutorListResult } from './dto/admin-tutor-list-result.dto';
import { AdminTutorStageCount } from './dto/admin-tutor-stage-count.dto';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 20;

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
  ) {}

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const [tutorSignupCount, studentSignupCount] = await Promise.all([
      this.userRepo.count({
        where: { role: UserRole.TUTOR, deleted: false },
      }),
      this.userRepo.count({
        where: { role: UserRole.STUDENT, deleted: false },
      }),
    ]);

    return { tutorSignupCount, studentSignupCount };
  }

  async listTutors(input: AdminTutorListInput): Promise<AdminTutorListResult> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE),
    );

    const qb = this.tutorRepo
      .createQueryBuilder('tutor')
      .innerJoinAndSelect('tutor.user', 'user')
      .where('tutor.deleted = :deleted', { deleted: false })
      .andWhere('tutor.certificationStage = :stage', {
        stage: input.certificationStage,
      });

    applyAdminTutorSearchFilter(qb, input.search);

    qb.orderBy('tutor.certificationStageEnteredAt', 'ASC', 'NULLS LAST');

    const skip = (page - 1) * pageSize;
    const [tutors, totalCount] = await qb.skip(skip).take(pageSize).getManyAndCount();

    const items: AdminTutorListItem[] = tutors.map((tutor) =>
      this.toAdminTutorListItem(tutor),
    );

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize),
    };
  }

  async getTutorStageCounts(search?: string): Promise<AdminTutorStageCount[]> {
    const qb = this.tutorRepo
      .createQueryBuilder('tutor')
      .innerJoin('tutor.user', 'user')
      .select('tutor.certificationStage', 'stage')
      .addSelect('COUNT(tutor.id)', 'count')
      .where('tutor.deleted = :deleted', { deleted: false })
      .groupBy('tutor.certificationStage');

    applyAdminTutorSearchFilter(qb, search);

    const rows = await qb.getRawMany<{ stage: string; count: string }>();

    return rows.map((row) => ({
      stage: row.stage as TutorCertificationStageEnum,
      count: parseInt(row.count, 10),
    }));
  }

  private toAdminTutorListItem(tutor: Tutor): AdminTutorListItem {
    const user = tutor.user;
    return {
      id: tutor.id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      mobile: user?.mobile,
      mobileCountryCode: user?.mobileCountryCode,
      mobileNumber: user?.mobileNumber,
      certificationStage: tutor.certificationStage,
      daysInStage: computeDaysInStage(tutor.certificationStageEnteredAt),
    };
  }
}
