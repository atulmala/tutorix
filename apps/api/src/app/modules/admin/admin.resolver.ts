import { Query, Resolver, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { AdminService } from './admin.service';
import { AdminDashboardStats } from './dto/admin-dashboard-stats.dto';
import { AdminTutorListInput } from './dto/admin-tutor-list.input';
import { AdminTutorListResult } from './dto/admin-tutor-list-result.dto';
import { AdminTutorStageCount } from './dto/admin-tutor-stage-count.dto';

@Resolver()
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

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
}
