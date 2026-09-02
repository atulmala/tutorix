import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunicationService } from '../../communication/communication.service';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { User } from '../../auth/entities/user.entity';
import { TutorOnboardingDocumentEligibilityService } from '../../document/services/tutor-onboarding-document-eligibility.service';
import { TutorCertificationStageEnum } from '../enums/tutor.enums';
import { Tutor } from '../entities/tutor.entity';
import { TutorService } from './tutor.service';
import { WalletService } from '../../wallet/services/wallet.service';

@Injectable()
export class TutorOnboardingService {
  private readonly logger = new Logger(TutorOnboardingService.name);

  constructor(
    private readonly tutorService: TutorService,
    private readonly documentEligibility: TutorOnboardingDocumentEligibilityService,
    private readonly walletService: WalletService,
    private readonly communicationService: CommunicationService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async completeDocsStep(tutor: Tutor): Promise<Tutor> {
    if (tutor.certificationStage !== TutorCertificationStageEnum.docs) {
      throw new BadRequestException(
        'Can only complete documents step when at docs stage',
      );
    }

    const evaluation =
      await this.documentEligibility.evaluateTutorOnboardingDocuments(tutor.id);
    if (!evaluation.passed) {
      throw new BadRequestException(
        evaluation.reason ??
          'All documents must pass verification before continuing.',
      );
    }

    return this.tutorService.updateCertificationStage(
      tutor.id,
      TutorCertificationStageEnum.interview,
    );
  }

  async approveTutorOnboarding(tutor: Tutor): Promise<Tutor> {
    if (tutor.certificationStage !== TutorCertificationStageEnum.interview) {
      throw new BadRequestException(
        'Can only approve tutors in application review stage',
      );
    }
    if (tutor.onBoardingComplete) {
      return tutor;
    }

    const evaluation =
      await this.documentEligibility.evaluateTutorOnboardingDocuments(tutor.id);
    if (!evaluation.passed) {
      throw new BadRequestException(
        evaluation.reason ?? 'Tutor does not meet document approval requirements.',
      );
    }

    await this.tutorService.updateCertificationStage(
      tutor.id,
      TutorCertificationStageEnum.complete,
    );
    const updated = await this.tutorService.updateOnboardingStatus(tutor.id, true);
    await this.walletService.ensureWalletForUser(updated.userId);
    await this.emitOnboardingApproved(updated);
    return updated;
  }

  async acknowledgeOnboardingCelebration(tutor: Tutor): Promise<Tutor> {
    if (!tutor.onBoardingComplete) {
      throw new BadRequestException(
        'Can only acknowledge celebration after onboarding is approved',
      );
    }
    if (tutor.onboardingCelebrationSeen) {
      return tutor;
    }
    return this.tutorService.updateOnboardingCelebrationSeen(tutor.id, true);
  }

  private async emitOnboardingApproved(tutor: Tutor): Promise<void> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: tutor.userId, deleted: false },
        select: ['id', 'firstName'],
      });
      await this.communicationService.emit({
        event: CommunicationEvent.TUTOR_ONBOARDING_APPROVED,
        userId: tutor.userId,
        entityType: 'tutor-onboarding-approved',
        entityId: String(tutor.id),
        payload: { firstName: user?.firstName?.trim() || 'there' },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`TUTOR_ONBOARDING_APPROVED emit failed: ${message}`);
    }
  }
}
