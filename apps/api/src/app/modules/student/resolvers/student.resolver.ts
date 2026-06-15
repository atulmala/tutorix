import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Student } from '../entities/student.entity';
import { StudentService } from '../services/student.service';
import { StudentDetailService } from '../services/student-detail.service';
import { AdminStudentDetail } from '../../admin/dto/admin-student-detail.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { SaveStudentParentInput } from '../dto/save-student-parent.input';
import { SaveStudentEducationInput } from '../dto/save-student-education.input';
import { PlatformFeePaymentService } from '../../payment/services/platform-fee-payment.service';

@Resolver(() => Student)
export class StudentResolver {
  constructor(
    private readonly studentService: StudentService,
    private readonly studentDetailService: StudentDetailService,
    private readonly platformFeePaymentService: PlatformFeePaymentService,
  ) {}

  @Query(() => AdminStudentDetail, {
    name: 'myStudentDetail',
    description: 'Full student profile after onboarding is complete',
  })
  @UseGuards(JwtAuthGuard)
  async myStudentDetail(@CurrentUser() user: User): Promise<AdminStudentDetail> {
    return this.studentDetailService.getMyStudentDetail(user);
  }

  @Query(() => Student, {
    name: 'myStudentProfile',
    nullable: true,
    description: 'Get current student profile, creates if it does not exist',
  })
  @UseGuards(JwtAuthGuard)
  async getMyStudentProfile(@CurrentUser() user: User): Promise<Student | null> {
    if (String(user.role).toUpperCase() !== 'STUDENT') {
      return null;
    }
    return this.studentService.ensureStudentExists(user.id);
  }

  @Mutation(() => Student, {
    description: 'Save parent/guardian details (student onboarding step 1)',
  })
  @UseGuards(JwtAuthGuard)
  async saveStudentParentStep(
    @CurrentUser() user: User,
    @Args('input') input: SaveStudentParentInput,
  ): Promise<Student> {
    return this.studentService.saveParentStep(user.id, input);
  }

  @Mutation(() => Student, {
    description: 'Save education details and advance to registration payment',
  })
  @UseGuards(JwtAuthGuard)
  async saveStudentEducation(
    @CurrentUser() user: User,
    @Args('input') input: SaveStudentEducationInput,
  ): Promise<Student> {
    return this.studentService.saveEducationStep(user.id, input);
  }

  @Mutation(() => Student, {
    description: 'Complete student registration payment step and finish onboarding',
  })
  @UseGuards(JwtAuthGuard)
  async completeStudentRegistrationPaymentStep(
    @CurrentUser() user: User,
  ): Promise<Student> {
    return this.platformFeePaymentService.completeStudentRegistrationPaymentStep(
      user,
    );
  }
}
