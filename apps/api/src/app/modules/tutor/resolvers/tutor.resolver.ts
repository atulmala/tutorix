import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { Tutor } from '../entities/tutor.entity';
import { TutorQualificationEntity } from '../entities/tutor-qualification.entity';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import { TutorService } from '../services/tutor.service';
import { TutorQualificationService } from '../services/tutor-qualification.service';
import { TutorOfferingService } from '../services/tutor-offering.service';
import { TutorOnboardingService } from '../services/tutor-onboarding.service';
import { TutorDetailService } from '../services/tutor-detail.service';
import { AdminTutorDetail } from '../../admin/dto/admin-tutor-detail.dto';
import { SaveTutorQualificationsInput } from '../dto/tutor-qualification.input';
import { SaveTutorOfferingsInput } from '../dto/tutor-offering.input';
import { TutorCertificationStageEnum } from '../enums/tutor.enums';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { SubmitProficiencyTestInput } from '../../proficiency/dto/submit-proficiency-test.input';
import { SubmitProficiencyTestResult } from '../../proficiency/dto/submit-proficiency-test.result';
import { ProficiencyTestEntity } from '../../proficiency/entities/proficiency-test.entity';
import { AddTutorOfferingResult } from '../dto/add-tutor-offering.result';
import { ProficiencyTestFeeInfo } from '../dto/proficiency-test-fee-info.dto';
import { TutorAddOfferingService } from '../services/tutor-add-offering.service';
import { TutorOfferingPtFeeService } from '../services/tutor-offering-pt-fee.service';
@Resolver(() => Tutor)
export class TutorResolver {
  constructor(
    private readonly tutorService: TutorService,
    private readonly tutorQualificationService: TutorQualificationService,
    private readonly tutorOfferingService: TutorOfferingService,
    private readonly tutorOnboardingService: TutorOnboardingService,
    private readonly tutorDetailService: TutorDetailService,
    private readonly tutorAddOfferingService: TutorAddOfferingService,
    private readonly ptFeeService: TutorOfferingPtFeeService,
  ) {}

  /**
   * Query: Get all tutors
   */
  @Query(() => [Tutor], { name: 'tutors', description: 'Get all active tutors' })
  async findAll(): Promise<Tutor[]> {
    return this.tutorService.findAll();
  }

  /**
   * Query: Get tutor by ID
   * @throws NotFoundException if tutor not found
   */
  @Query(() => Tutor, { name: 'tutor', nullable: true, description: 'Get tutor by ID' })
  async findOne(@Args('id', { type: () => ID }) id: number): Promise<Tutor> {
    return this.tutorService.findOne(id);
  }

  /**
   * Query: Get current authenticated tutor's profile
   * Creates tutor if it doesn't exist
   */
  @ResolveField(() => [TutorQualificationEntity], {
    description: 'Qualifications for this tutor (excludes soft-deleted)',
  })
  async qualifications(
    @Parent() tutor: Tutor,
  ): Promise<TutorQualificationEntity[]> {
    return this.tutorQualificationService.findByTutorId(tutor.id);
  }

  @ResolveField(() => [TutorOfferingEntity], {
    description: 'Offerings selected by this tutor with PT status',
  })
  async tutorOfferings(
    @Parent() tutor: Tutor,
  ): Promise<TutorOfferingEntity[]> {
    return this.tutorOfferingService.findByTutorId(tutor.id);
  }

  /**
   * Query: Get proficiency test with 30 random questions for a tutor offering.
   * Used when starting the PT. Verifies the offering belongs to the tutor.
   */
  @Query(() => ProficiencyTestEntity, {
    name: 'proficiencyTestForTaker',
    description:
      'Get proficiency test with 30 random questions for a tutor offering (authenticated)',
  })
  @UseGuards(JwtAuthGuard)
  async proficiencyTestForTaker(
    @CurrentUser() user: User,
    @Args('tutorOfferingId', { type: () => ID }) tutorOfferingId: number,
  ): Promise<ProficiencyTestEntity> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new BadRequestException('Tutor profile not found for this user');
    }
    const tutorOffering = await this.tutorOfferingService.findByIdForTutor(
      tutorOfferingId,
      tutor.id,
    );
    await this.tutorOfferingService.assertCanTakeProficiencyTest(tutorOffering);
    const test =
      await this.tutorOfferingService.getProficiencyTestWith30Questions(
        tutorOffering.proficiencyTestId,
      );
    if (!test) {
      throw new BadRequestException(
        'Proficiency test not found or has no questions',
      );
    }
    return test;
  }

  @Query(() => AdminTutorDetail, {
    name: 'myTutorDetail',
    description:
      'Full tutor profile for certified tutors (onboarding complete and celebration acknowledged)',
  })
  @UseGuards(JwtAuthGuard)
  async myTutorDetail(@CurrentUser() user: User): Promise<AdminTutorDetail> {
    return this.tutorDetailService.getMyTutorDetail(user);
  }

  @Query(() => Tutor, { name: 'myTutorProfile', nullable: true, description: 'Get current tutor profile, creates if doesn\'t exist' })
  @UseGuards(JwtAuthGuard)
  async getMyTutorProfile(@CurrentUser() user: User): Promise<Tutor | null> {
    if (String(user.role).toUpperCase() !== 'TUTOR') {
      return null;
    }

    return this.tutorService.ensureTutorExists(user.id);
  }

  /**
   * Mutation: Save tutor qualifications (replaces all for current tutor)
   * At least one qualification must be Higher Secondary.
   */
  @Mutation(() => [TutorQualificationEntity], {
    description: 'Save qualifications for the authenticated tutor (replaces existing)',
  })
  @UseGuards(JwtAuthGuard)
  async saveTutorQualifications(
    @CurrentUser() user: User,
    @Args('input') input: SaveTutorQualificationsInput,
  ): Promise<TutorQualificationEntity[]> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new Error('Tutor profile not found for this user');
    }
    return this.tutorQualificationService.saveForTutor(tutor.id, input.qualifications, {
      advanceToNextStep: input.advanceToNextStep !== false,
    });
  }

  /**
   * Mutation: Save tutor offerings and advance to PT stage.
   * Creates tutor_offering rows for each leaf offering. Each gets 2 PT attempts.
   */
  @Mutation(() => AddTutorOfferingResult, {
    description:
      'Add a new offering after onboarding; creates pending PT and proficiency test fee record',
  })
  @UseGuards(JwtAuthGuard)
  async addMyTutorOffering(
    @CurrentUser() user: User,
    @Args('offeringId', { type: () => ID }) offeringId: number,
  ): Promise<AddTutorOfferingResult> {
    return this.tutorAddOfferingService.addMyTutorOffering(user, offeringId);
  }

  @Query(() => ProficiencyTestFeeInfo, {
    name: 'ptFeeInfo',
    description: 'Proficiency test fee info for a tutor offering',
  })
  @UseGuards(JwtAuthGuard)
  async ptFeeInfo(
    @CurrentUser() user: User,
    @Args('tutorOfferingId', { type: () => ID }) tutorOfferingId: number,
  ): Promise<ProficiencyTestFeeInfo> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new BadRequestException('Tutor profile not found for this user');
    }
    await this.tutorOfferingService.findByIdForTutor(tutorOfferingId, tutor.id);
    return this.ptFeeService.getFeeInfoForTutorOffering(tutorOfferingId);
  }

  @Mutation(() => [TutorOfferingEntity], {
    description: 'Save offerings for the authenticated tutor and advance to PT stage',
  })
  @UseGuards(JwtAuthGuard)
  async saveTutorOfferings(
    @CurrentUser() user: User,
    @Args('input') input: SaveTutorOfferingsInput,
  ): Promise<TutorOfferingEntity[]> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new BadRequestException('Tutor profile not found for this user');
    }
    const saved = await this.tutorOfferingService.saveForTutor(
      tutor.id,
      input.offeringIds,
      {
        advanceToNextStep: input.advanceToNextStep !== false,
        isInitialOnboarding: true,
      },
    );
    if (input.advanceToNextStep !== false) {
      await this.tutorService.updateCertificationStage(
        tutor.id,
        TutorCertificationStageEnum.pt,
      );
    }
    return saved;
  }

  /**
   * Mutation: Submit proficiency test answers.
   * Updates attempt count and status. Advances to registrationPayment on pass.
   */
  @Mutation(() => SubmitProficiencyTestResult, {
    description: 'Submit proficiency test answers for a tutor offering',
  })
  @UseGuards(JwtAuthGuard)
  async submitProficiencyTest(
    @CurrentUser() user: User,
    @Args('input') input: SubmitProficiencyTestInput,
  ): Promise<SubmitProficiencyTestResult> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new BadRequestException('Tutor profile not found for this user');
    }
    return this.tutorOfferingService.submitProficiencyTest(tutor.id, input);
  }

  /**
   * Mutation: Complete experience step (advance to offerings)
   * Valid only when tutor is at experience stage.
   */
  @Mutation(() => Tutor, {
    description: 'Complete the experience step and advance to offerings',
  })
  @UseGuards(JwtAuthGuard)
  async completeExperienceStep(@CurrentUser() user: User): Promise<Tutor> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new Error('Tutor profile not found for this user');
    }
    if (tutor.certificationStage !== TutorCertificationStageEnum.experience) {
      throw new BadRequestException(
        'Can only complete experience step when at experience stage'
      );
    }
    return this.tutorService.updateCertificationStage(
      tutor.id,
      TutorCertificationStageEnum.offerings,
    );
  }

  /**
   * Mutation: Skip/finish registration fee step (payment not implemented yet) and advance to docs.
   */
  @Mutation(() => Tutor, {
    description:
      'Complete registration payment placeholder step; advances certificationStage to docs',
  })
  @UseGuards(JwtAuthGuard)
  async completeRegistrationPaymentStep(@CurrentUser() user: User): Promise<Tutor> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new BadRequestException('Tutor profile not found for this user');
    }
    if (
      tutor.certificationStage !== TutorCertificationStageEnum.registrationPayment
    ) {
      throw new BadRequestException(
        'Can only complete registration payment step when at registrationPayment stage',
      );
    }
    return this.tutorService.updateCertificationStage(
      tutor.id,
      TutorCertificationStageEnum.docs,
    );
  }

  /**
   * Mutation: Complete documents step when all four onboarding documents pass verification.
   */
  @Mutation(() => Tutor, {
    description:
      'Complete documents step and advance to application review (interview)',
  })
  @UseGuards(JwtAuthGuard)
  async completeDocsStep(@CurrentUser() user: User): Promise<Tutor> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new BadRequestException('Tutor profile not found for this user');
    }
    return this.tutorOnboardingService.completeDocsStep(tutor);
  }

  /**
   * Mutation: Mark onboarding celebration as seen (after user goes to dashboard).
   */
  @Mutation(() => Tutor, {
    description:
      'Acknowledge onboarding approval celebration; routes tutor to profile on next login',
  })
  @UseGuards(JwtAuthGuard)
  async acknowledgeOnboardingCelebration(
    @CurrentUser() user: User,
  ): Promise<Tutor> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new BadRequestException('Tutor profile not found for this user');
    }
    return this.tutorOnboardingService.acknowledgeOnboardingCelebration(tutor);
  }

  /**
   * Mutation: Delete a tutor (soft delete)
   */
  @Mutation(() => Boolean, { description: 'Delete a tutor (soft delete)' })
  async removeTutor(@Args('id', { type: () => ID }) id: number): Promise<boolean> {
    return this.tutorService.remove(id);
  }
}

