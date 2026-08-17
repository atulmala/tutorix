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
import { AdminStudentListInput } from './dto/admin-student-list.input';
import { AdminStudentListResult } from './dto/admin-student-list-result.dto';
import { AdminStudentStageCount } from './dto/admin-student-stage-count.dto';
import { AdminStudentDetail } from './dto/admin-student-detail.dto';
import { AdminTutorDetail } from './dto/admin-tutor-detail.dto';
import { AdminTutorDocumentDetail } from './dto/admin-tutor-document-detail.dto';
import { AdminTutorListInput } from './dto/admin-tutor-list.input';
import { AdminTutorListResult } from './dto/admin-tutor-list-result.dto';
import { AdminTutorStageCount } from './dto/admin-tutor-stage-count.dto';
import { AdminProficiencyTestListItem } from './dto/admin-proficiency-test-list-item.dto';
import { ProficiencyTestEntity } from '../proficiency/entities/proficiency-test.entity';
import { TutorCalendar } from '../tutor-calendar/entities/tutor-calendar.entity';
import { TutorCalendarService } from '../tutor-calendar/services/tutor-calendar.service';
import { AdminPlatformFeeConfig } from './dto/admin-platform-fee-config.dto';
import { AdminUpdatePlatformFeeInput } from '../platform-fee/dto/admin-update-platform-fee.input';
import { RegistrationSettingsEntity } from '../registration-settings/entities/registration-settings.entity';
import { AdminUpdateRegistrationSettingsInput } from '../registration-settings/dto/admin-update-registration-settings.input';
import { CommerceAdminService } from '../commerce/services/commerce-admin.service';
import { AdminOrderListInput } from '../commerce/dto/admin/admin-order-list.input';
import { AdminOrderListResult } from '../commerce/dto/admin/admin-order-list-result.dto';
import { AdminOrderDetail } from '../commerce/dto/admin/admin-order-detail.dto';
import { StudentService } from '../student/services/student.service';
import { TutorService } from '../tutor/services/tutor.service';
import { WalletService } from '../wallet/services/wallet.service';
import {
  UserWalletDto,
  WalletTransactionConnectionDto,
} from '../wallet/dto/wallet.dto';
import { EmailService } from '../communication/email/email.service';
import { EmailPurpose } from '../communication/email/enums/email-purpose.enum';
import { wrapPlainTextAsHtml } from '../communication/email/email.utils';
import { AdminEmailStatus } from '../communication/email/dto/admin-email-status.dto';
import { AdminSendEmailInput } from '../communication/email/dto/admin-send-email.input';
import { AdminSendEmailResult } from '../communication/email/dto/admin-send-email-result.dto';
import { CommunicationAdminService } from '../communication/communication.admin.service';
import { AdminCommunicationCatalog } from '../communication/dto/admin-communication-catalog.dto';
import { AdminUpdateCommunicationRuleInput } from '../communication/dto/admin-update-communication-rule.input';
import { AdminUpdateCommunicationTemplateInput } from '../communication/dto/admin-update-communication-template.input';

@Resolver()
export class AdminResolver {
  constructor(
    private readonly adminService: AdminService,
    private readonly tutorCalendarService: TutorCalendarService,
    private readonly commerceAdminService: CommerceAdminService,
    private readonly studentService: StudentService,
    private readonly tutorService: TutorService,
    private readonly walletService: WalletService,
    private readonly emailService: EmailService,
    private readonly communicationAdminService: CommunicationAdminService,
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

  @Query(() => AdminStudentListResult, {
    description: 'Paginated students filtered by onboarding stage (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminStudents(
    @Args('input') input: AdminStudentListInput,
  ): Promise<AdminStudentListResult> {
    return this.adminService.listStudents(input);
  }

  @Query(() => [AdminStudentStageCount], {
    description: 'Student counts grouped by onboarding stage (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminStudentStageCounts(): Promise<AdminStudentStageCount[]> {
    return this.adminService.getStudentStageCounts();
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

  @Query(() => AdminStudentDetail, {
    description: 'Full student onboarding profile for admin review (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminStudentDetail(
    @Args('studentId', { type: () => Int }) studentId: number,
  ): Promise<AdminStudentDetail> {
    return this.adminService.getStudentDetail(studentId);
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

  @Query(() => [AdminPlatformFeeConfig], {
    description: 'Platform fee configuration rows (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminPlatformFees(): Promise<AdminPlatformFeeConfig[]> {
    return this.adminService.listPlatformFees();
  }

  @Mutation(() => AdminPlatformFeeConfig, {
    description: 'Update a platform fee configuration row (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdatePlatformFee(
    @Args('input') input: AdminUpdatePlatformFeeInput,
  ): Promise<AdminPlatformFeeConfig> {
    return this.adminService.updatePlatformFee(input);
  }

  @Query(() => RegistrationSettingsEntity, {
    description: 'Tutor/student registration enable flags (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminRegistrationSettings(): Promise<RegistrationSettingsEntity> {
    return this.adminService.getRegistrationSettings();
  }

  @Mutation(() => RegistrationSettingsEntity, {
    description: 'Update tutor/student registration enable flags (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdateRegistrationSettings(
    @Args('input') input: AdminUpdateRegistrationSettingsInput,
  ): Promise<RegistrationSettingsEntity> {
    return this.adminService.updateRegistrationSettings(input);
  }

  @Query(() => AdminOrderListResult, {
    description: 'Paginated commerce orders (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminOrders(
    @Args('input') input: AdminOrderListInput,
  ): Promise<AdminOrderListResult> {
    return this.commerceAdminService.listOrders(input);
  }

  @Query(() => AdminOrderDetail, {
    description: 'Commerce order detail with items, invoice, and payments (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminOrderDetail(
    @Args('orderId', { type: () => Int }) orderId: number,
  ): Promise<AdminOrderDetail> {
    return this.commerceAdminService.getOrderDetail(orderId);
  }

  @Query(() => UserWalletDto, {
    nullable: true,
    description: 'Wallet balance for a student (admin only; null if none)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminStudentWallet(
    @Args('studentId', { type: () => Int }) studentId: number,
  ): Promise<UserWalletDto | null> {
    const student = await this.studentService.findOne(studentId);
    const wallet = await this.walletService.findWalletForUser(student.userId);
    return wallet ? this.walletService.toWalletDto(wallet) : null;
  }

  @Query(() => WalletTransactionConnectionDto, {
    description: 'Wallet transactions for a student (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminStudentWalletTransactions(
    @Args('studentId', { type: () => Int }) studentId: number,
    @Args('first', { type: () => Int, nullable: true, defaultValue: 20 })
    first?: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset?: number,
  ): Promise<WalletTransactionConnectionDto> {
    const student = await this.studentService.findOne(studentId);
    return this.walletService.listTransactionsForAdmin(
      student.userId,
      first,
      offset,
    );
  }

  @Query(() => UserWalletDto, {
    nullable: true,
    description: 'Wallet balance for a tutor (admin only; null if none)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminTutorWallet(
    @Args('tutorId', { type: () => Int }) tutorId: number,
  ): Promise<UserWalletDto | null> {
    const tutor = await this.tutorService.findOne(tutorId);
    const wallet = await this.walletService.findWalletForUser(tutor.userId);
    return wallet ? this.walletService.toWalletDto(wallet) : null;
  }

  @Query(() => WalletTransactionConnectionDto, {
    description: 'Wallet transactions for a tutor (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminTutorWalletTransactions(
    @Args('tutorId', { type: () => Int }) tutorId: number,
    @Args('first', { type: () => Int, nullable: true, defaultValue: 20 })
    first?: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset?: number,
  ): Promise<WalletTransactionConnectionDto> {
    const tutor = await this.tutorService.findOne(tutorId);
    return this.walletService.listTransactionsForAdmin(
      tutor.userId,
      first,
      offset,
    );
  }

  @Query(() => AdminEmailStatus, {
    description: 'Current email delivery status (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminEmailStatus(): Promise<AdminEmailStatus> {
    return this.emailService.getStatus();
  }

  @Mutation(() => AdminSendEmailResult, {
    description: 'Send a one-off email via the configured provider (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminSendEmail(
    @Args('input') input: AdminSendEmailInput,
  ): Promise<AdminSendEmailResult> {
    const result = await this.emailService.send({
      to: input.to,
      subject: input.subject,
      text: input.body,
      html: wrapPlainTextAsHtml(input.body),
      purpose: EmailPurpose.ADMIN_TEST,
      tags: { purpose: 'admin-test' },
    });
    return {
      success: true,
      messageId: result.messageId,
    };
  }

  @Query(() => AdminCommunicationCatalog, {
    description: 'Communication event rules and file-backed templates (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminCommunicationCatalog(): Promise<AdminCommunicationCatalog> {
    return this.communicationAdminService.getCatalog();
  }

  @Mutation(() => AdminCommunicationCatalog, {
    description: 'Update channel routing for a communication event (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdateCommunicationRule(
    @Args('input') input: AdminUpdateCommunicationRuleInput,
  ): Promise<AdminCommunicationCatalog> {
    return this.communicationAdminService.updateRule(input);
  }

  @Mutation(() => AdminCommunicationCatalog, {
    description: 'Write a communication template file (admin only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdateCommunicationTemplate(
    @Args('input') input: AdminUpdateCommunicationTemplateInput,
  ): Promise<AdminCommunicationCatalog> {
    return this.communicationAdminService.updateTemplate(input);
  }
}
