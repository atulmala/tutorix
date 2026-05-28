import { BadRequestException, Injectable } from '@nestjs/common';
import { TutorOnboardingDocumentEligibilityService } from '../../document/services/tutor-onboarding-document-eligibility.service';
import { TutorCertificationStageEnum } from '../enums/tutor.enums';
import { Tutor } from '../entities/tutor.entity';
import { TutorService } from './tutor.service';

@Injectable()
export class TutorOnboardingService {
  constructor(
    private readonly tutorService: TutorService,
    private readonly documentEligibility: TutorOnboardingDocumentEligibilityService,
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
    return this.tutorService.updateOnboardingStatus(tutor.id, true);
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
}
