import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { AddTutorOfferingResult } from '../dto/add-tutor-offering.result';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import { Tutor } from '../entities/tutor.entity';
import { TutorOfferingService } from './tutor-offering.service';
import { TutorOfferingPtFeeService } from './tutor-offering-pt-fee.service';
import { TutorService } from './tutor.service';

@Injectable()
export class TutorAddOfferingService {
  constructor(
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepo: Repository<TutorOfferingEntity>,
    private readonly tutorService: TutorService,
    private readonly tutorOfferingService: TutorOfferingService,
    private readonly ptFeeService: TutorOfferingPtFeeService,
  ) {}

  private async requireOnboardedTutor(user: User): Promise<Tutor> {
    if (user.role !== UserRole.TUTOR) {
      throw new ForbiddenException('Only tutors can add offerings');
    }
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new BadRequestException('Tutor profile not found for this user');
    }
    if (!tutor.onBoardingComplete || !tutor.onboardingCelebrationSeen) {
      throw new ForbiddenException(
        'Add offering is available after onboarding is complete',
      );
    }
    return tutor;
  }

  async addMyTutorOffering(
    user: User,
    offeringId: number,
  ): Promise<AddTutorOfferingResult> {
    const tutor = await this.requireOnboardedTutor(user);

    const existing = await this.tutorOfferingRepo.findOne({
      where: { tutorId: tutor.id, offeringId, deleted: false },
    });
    if (existing) {
      throw new BadRequestException('You already teach this offering');
    }

    const pending = await this.tutorOfferingService.findPendingForTutor(tutor.id);
    if (pending.length > 0) {
      throw new BadRequestException(
        `Complete the proficiency test for your current offering first (offering id ${pending[0].id}).`,
      );
    }

    const [saved] = await this.tutorOfferingService.saveForTutor(
      tutor.id,
      [offeringId],
      { isInitialOnboarding: false, advanceToNextStep: false },
    );

    const ptFee = await this.ptFeeService.getFeeInfoForTutorOffering(saved.id);

    const withRelations = await this.tutorOfferingService.findByIdForTutor(
      saved.id,
      tutor.id,
    );

    return {
      tutorOffering: withRelations,
      ptFee,
    };
  }
}
