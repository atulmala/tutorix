import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { AdminReviewEducationDocumentInput } from '../document/dto/admin-review-education-document.input';
import { AdminService } from './admin.service';
import { AdminDashboardStats } from './dto/admin-dashboard-stats.dto';
import { AdminTutorDetail } from './dto/admin-tutor-detail.dto';
import { AdminTutorDocumentDetail } from './dto/admin-tutor-document-detail.dto';
import { AdminTutorListInput } from './dto/admin-tutor-list.input';
import { AdminTutorListResult } from './dto/admin-tutor-list-result.dto';
import { AdminTutorStageCount } from './dto/admin-tutor-stage-count.dto';
import { AdminProficiencyTestListItem } from './dto/admin-proficiency-test-list-item.dto';
import { ProficiencyTestEntity } from '../proficiency/entities/proficiency-test.entity';
import { TutorCalendar } from '../tutor-calendar/entities/tutor-calendar.entity';
import { TutorCalendarService } from '../tutor-calendar/services/tutor-calendar.service';

@Resolver()
export class AdminResolver {
  constructor(
    private readonly adminService: AdminService,
    private readonly tutorCalendarService: TutorCalendarService,
  ) {}

  @Query(() => AdminDashboardStats, {
    description: 'Signup counts for admin dashboard (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminDashboardStats(): Promise<AdminDashboardStats> {
    return this.adminService.getDashboardStats();
  }

  @Query(() => AdminTutorListResult, {
    description: 'Paginated tutors filtered by onboarding stage (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminTutors(
    @Args('input') input: AdminTutorListInput,
  ): Promise<AdminTutorListResult> {
    return this.adminService.listTutors(input);
  }

  @Query(() => [AdminTutorStageCount], {
    description: 'Tutor counts grouped by onboarding stage (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminTutorStageCounts(
    @Args('search', { nullable: true }) search?: string,
  ): Promise<AdminTutorStageCount[]> {
    return this.adminService.getTutorStageCounts(search);
  }

  @Query(() => AdminTutorDetail, {
    description: 'Full tutor onboarding profile for admin review (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminTutorDetail(
    @Args('tutorId', { type: () => Int }) tutorId: number,
  ): Promise<AdminTutorDetail> {
    return this.adminService.getTutorDetail(tutorId);
  }

  @Query(() => [TutorCalendar], {
    description:
      'Available teaching slots for a tutor within a date range (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminTutorCalendar(
    @Args('tutorId', { type: () => Int }) tutorId: number,
    @Args('from') from: Date,
    @Args('to') to: Date,
  ): Promise<TutorCalendar[]> {
    return this.tutorCalendarService.getAdminCalendar(tutorId, from, to);
  }

  @Query(() => Date, {
    nullable: true,
    description:
      'Latest available slot start for a tutor, or null if none (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminTutorCalendarUpdatedTill(
    @Args('tutorId', { type: () => Int }) tutorId: number,
  ): Promise<Date | null> {
    return this.tutorCalendarService.getAdminCalendarUpdatedTill(tutorId);
  }

  @Mutation(() => AdminTutorDocumentDetail, {
    description: 'Approve or reject a tutor onboarding document (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminReviewDocument(
    @Args('input') input: AdminReviewEducationDocumentInput,
    @CurrentUser() admin: User,
  ): Promise<AdminTutorDocumentDetail> {
    return this.adminService.reviewDocument(
      input.documentId,
      input.approve,
      admin.id,
      input.note,
    );
  }

  @Mutation(() => AdminTutorDetail, {
    description: 'Mark or unmark a tutor as a test tutor (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminSetTestTutor(
    @Args('tutorId', { type: () => Int }) tutorId: number,
    @Args('testTutor') testTutor: boolean,
  ): Promise<AdminTutorDetail> {
    return this.adminService.setTestTutor(tutorId, testTutor);
  }

  @Query(() => [AdminProficiencyTestListItem], {
    description: 'All proficiency tests for admin management (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminProficiencyTests(): Promise<AdminProficiencyTestListItem[]> {
    return this.adminService.listProficiencyTests();
  }

  @Query(() => ProficiencyTestEntity, {
    description:
      'Proficiency test with full question pool and correct answers (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminProficiencyTestDetail(
    @Args('testId', { type: () => Int }) testId: number,
  ): Promise<ProficiencyTestEntity> {
    return this.adminService.getProficiencyTestDetail(testId);
  }
}
