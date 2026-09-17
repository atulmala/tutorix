import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProficiencyTestEntity } from '../../proficiency/entities/proficiency-test.entity';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import { TutorOfferingStatusEnum, TutorCertificationStageEnum } from '../enums/tutor.enums';
import { ProficiencyTestService } from '../../proficiency/services/proficiency-test.service';
import { TutorService } from './tutor.service';
import { SubmitProficiencyTestInput } from '../../proficiency/dto/submit-proficiency-test.input';
import { SubmitProficiencyTestResult } from '../../proficiency/dto/submit-proficiency-test.result';
import { filterQuestionsWithoutImages } from '../../proficiency/proficiency.utils';
import { TutorOfferingPtFeeService } from './tutor-offering-pt-fee.service';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import { PT_ALREADY_CLEARED_MESSAGE } from '@tutorix/shared-utils';

const PT_MAX_ATTEMPTS = 2;

@Injectable()
export class TutorOfferingService {
  constructor(
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepository: Repository<TutorOfferingEntity>,
    private readonly proficiencyTestService: ProficiencyTestService,
    private readonly tutorService: TutorService,
    private readonly ptFeeService: TutorOfferingPtFeeService,
    private readonly tutorRateCardService: TutorRateCardService,
  ) {}

  /**
   * Validates the tutor offering may start or continue a proficiency test attempt.
   */
  async assertCanTakeProficiencyTest(
    tutorOffering: TutorOfferingEntity,
  ): Promise<void> {
    if (tutorOffering.status === TutorOfferingStatusEnum.pt_passed) {
      throw new BadRequestException(
        'Proficiency test already passed for this offering',
      );
    }

    const overlappingPass = await this.findPassedSiblingForSamePt(
      tutorOffering.tutorId,
      tutorOffering,
    );
    if (overlappingPass) {
      throw new BadRequestException(PT_ALREADY_CLEARED_MESSAGE);
    }

    const canRetryFailed =
      tutorOffering.status === TutorOfferingStatusEnum.pt_failed &&
      tutorOffering.attemptsUsed < PT_MAX_ATTEMPTS;

    if (
      tutorOffering.status !== TutorOfferingStatusEnum.pending_pt &&
      !canRetryFailed
    ) {
      throw new BadRequestException(
        'Proficiency test is not available for this offering',
      );
    }

    if (tutorOffering.attemptsUsed >= PT_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'No attempts remaining. Select another offering or retry after 30 days.',
      );
    }

    await this.ptFeeService.assertCanTakeProficiencyTest(tutorOffering.id);
  }

  /**
   * Save tutor offerings and optionally advance to PT stage.
   * Creates one TutorOffering per offeringId with status pending_pt.
   * Each new offering gets fresh 2 attempts.
   */
  async saveForTutor(
    tutorId: number,
    offeringIds: number[],
    options: { advanceToNextStep?: boolean; isInitialOnboarding?: boolean },
  ): Promise<TutorOfferingEntity[]> {
    if (!offeringIds.length) {
      throw new BadRequestException('At least one offering must be selected');
    }

    const saved: TutorOfferingEntity[] = [];

    for (const offeringId of offeringIds) {
      const existing = await this.tutorOfferingRepository.findOne({
        where: { tutorId, offeringId, deleted: false },
      });
      if (existing) {
        await this.ptFeeService.ensureFeeRecordForTutorOffering(existing.id);
        saved.push(existing);
        continue;
      }

      const proficiencyTest =
        await this.proficiencyTestService.getTestForOffering(offeringId);

      const tutorOffering = this.tutorOfferingRepository.create({
        tutorId,
        offeringId,
        proficiencyTestId: proficiencyTest.id,
        status: TutorOfferingStatusEnum.pending_pt,
        attemptsUsed: 0,
        isInitialOnboarding: options.isInitialOnboarding ?? true,
      });
      const created = await this.tutorOfferingRepository.save(tutorOffering);
      await this.ptFeeService.ensureFeeRecordForTutorOffering(created.id);
      saved.push(created);
    }

    return saved;
  }

  /**
   * Find tutor offerings for a tutor (optionally filter by status).
   */
  async findByTutorId(
    tutorId: number,
    status?: TutorOfferingStatusEnum,
  ): Promise<TutorOfferingEntity[]> {
    const where: { tutorId: number; deleted: false; status?: TutorOfferingStatusEnum } = {
      tutorId,
      deleted: false,
    };
    if (status) where.status = status;
    return this.tutorOfferingRepository.find({
      where,
      relations: ['offering', 'proficiencyTest'],
      order: { createdDate: 'DESC' },
    });
  }

  /**
   * Find pending PT offerings for a tutor (status = pending_pt, attempts < 2).
   */
  async findPendingForTutor(tutorId: number): Promise<TutorOfferingEntity[]> {
    return this.tutorOfferingRepository.find({
      where: {
        tutorId,
        status: TutorOfferingStatusEnum.pending_pt,
        deleted: false,
      },
      relations: ['offering', 'proficiencyTest'],
      order: { createdDate: 'ASC' },
    });
  }

  /**
   * Get proficiency test with 30 randomly selected questions.
   */
  async getProficiencyTestWith30Questions(
    proficiencyTestId: number,
  ): Promise<ProficiencyTestEntity | null> {
    return this.proficiencyTestService.getTestWith30QuestionsForTaker(
      proficiencyTestId,
    );
  }

  /**
   * Get tutor offering by ID, ensuring it belongs to the tutor.
   */
  async findByIdForTutor(
    id: number,
    tutorId: number,
  ): Promise<TutorOfferingEntity> {
    const to = await this.tutorOfferingRepository.findOne({
      where: { id, tutorId, deleted: false },
      relations: ['proficiencyTest'],
    });
    if (!to) {
      throw new NotFoundException(`Tutor offering ${id} not found`);
    }
    return to;
  }

  async findByIds(ids: number[]): Promise<TutorOfferingEntity[]> {
    const uniqueIds = [...new Set(ids.filter((id) => id > 0))];
    if (uniqueIds.length === 0) {
      return [];
    }
    return this.tutorOfferingRepository.find({
      where: { id: In(uniqueIds), deleted: false },
    });
  }

  /**
   * Submit proficiency test answers, compute score, update tutor offering.
   * Returns result with passed/failed and updated attempt count.
   */
  async submitProficiencyTest(
    tutorId: number,
    input: SubmitProficiencyTestInput,
  ): Promise<SubmitProficiencyTestResult> {
    const tutorOffering = await this.findByIdForTutor(
      input.tutorOfferingId,
      tutorId,
    );

    await this.assertCanTakeProficiencyTest(tutorOffering);

    const test = await this.proficiencyTestService.getTestWithQuestionsForTaker(
      tutorOffering.proficiencyTestId,
    );
    if (!test?.questions?.length) {
      throw new BadRequestException('Proficiency test has no questions');
    }

    const questions = filterQuestionsWithoutImages(test.questions);
    const answerMap = new Map<number, number>();
    for (const q of questions) {
      const correctAnswer = q.answers?.find((a) => a.answer === true);
      if (correctAnswer) {
        answerMap.set(q.id, correctAnswer.id);
      }
    }

    let correct = 0;
    const answeredQuestionIds = new Set<number>();
    for (const a of input.answers) {
      if (answeredQuestionIds.has(a.questionId)) continue;
      answeredQuestionIds.add(a.questionId);
      const correctId = answerMap.get(a.questionId);
      if (correctId === a.answerId) correct++;
    }

    // Use test.score (max marks from proficiency_test) as maxScore; fallback to answered count
    const answeredCount = answeredQuestionIds.size;
    const maxScore =
      test.score != null && test.score > 0 ? test.score : answeredCount;
    const score = correct;
    const percentage =
      maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percentage >= (test.passPercentage ?? 65);

    tutorOffering.attemptsUsed += 1;
    tutorOffering.lastScore = score;
    tutorOffering.lastMaxScore = maxScore;
    tutorOffering.lastAttemptAt = new Date();
    if (input.timeTakenSeconds != null) {
      tutorOffering.lastTimeTakenSeconds = input.timeTakenSeconds;
    }

    if (passed) {
      tutorOffering.status = TutorOfferingStatusEnum.pt_passed;
      tutorOffering.passedAt = new Date();
      const tutor = await this.tutorService.findOne(tutorId);
      if (
        tutorOffering.isInitialOnboarding &&
        tutor.certificationStage === TutorCertificationStageEnum.pt
      ) {
        await this.tutorService.updateCertificationStage(
          tutorId,
          TutorCertificationStageEnum.registrationPayment,
        );
      }
    } else if (tutorOffering.attemptsUsed >= PT_MAX_ATTEMPTS) {
      tutorOffering.status = TutorOfferingStatusEnum.pt_failed;
    }

    await this.tutorOfferingRepository.save(tutorOffering);
    if (passed) {
      await this.creditSamePtOfferings(tutorId, tutorOffering);
    }

    return {
      passed,
      score,
      maxScore,
      attemptsUsed: tutorOffering.attemptsUsed,
      passPercentage: test.passPercentage,
      tutorOfferingId: tutorOffering.id,
    };
  }

  async creditOverlappingPtPass(
    tutorId: number,
    tutorOfferingId: number,
  ): Promise<TutorOfferingEntity> {
    const tutorOffering = await this.findByIdForTutor(tutorOfferingId, tutorId);
    if (tutorOffering.status === TutorOfferingStatusEnum.pt_passed) {
      return tutorOffering;
    }
    const sibling = await this.findPassedSiblingForSamePt(tutorId, tutorOffering);
    if (!sibling) {
      throw new BadRequestException(
        'No overlapping passed proficiency test found for this offering',
      );
    }
    this.copyPassFromSource(tutorOffering, sibling);
    const saved = await this.tutorOfferingRepository.save(tutorOffering);
    await this.tutorRateCardService.copyRateCardToOffering(
      sibling.id,
      saved.id,
    );
    return saved;
  }

  private async findPassedSiblingForSamePt(
    tutorId: number,
    tutorOffering: TutorOfferingEntity,
  ): Promise<TutorOfferingEntity | null> {
    if (tutorOffering.proficiencyTestId == null) {
      return null;
    }
    const siblings = await this.tutorOfferingRepository.find({
      where: {
        tutorId,
        proficiencyTestId: tutorOffering.proficiencyTestId,
        status: TutorOfferingStatusEnum.pt_passed,
        deleted: false,
      },
    });
    return (
      siblings.find(
        (offering) =>
          offering.id !== tutorOffering.id &&
          offering.status === TutorOfferingStatusEnum.pt_passed,
      ) ?? null
    );
  }

  private async creditSamePtOfferings(
    tutorId: number,
    passedOffering: TutorOfferingEntity,
  ): Promise<void> {
    const siblings = await this.tutorOfferingRepository.find({
      where: {
        tutorId,
        proficiencyTestId: passedOffering.proficiencyTestId,
        deleted: false,
      },
    });
    for (const sibling of siblings) {
      if (
        sibling.id === passedOffering.id ||
        sibling.status === TutorOfferingStatusEnum.pt_passed
      ) {
        continue;
      }
      this.copyPassFromSource(sibling, passedOffering);
      await this.tutorOfferingRepository.save(sibling);
      await this.tutorRateCardService.copyRateCardToOffering(
        passedOffering.id,
        sibling.id,
      );
    }
  }

  private copyPassFromSource(
    target: TutorOfferingEntity,
    source: TutorOfferingEntity,
  ): void {
    target.status = TutorOfferingStatusEnum.pt_passed;
    target.passedAt = source.passedAt ?? new Date();
    target.lastScore = source.lastScore;
    target.lastMaxScore = source.lastMaxScore;
    target.lastAttemptAt = source.lastAttemptAt;
    target.lastTimeTakenSeconds = source.lastTimeTakenSeconds;
    target.attemptsUsed = source.attemptsUsed;
  }
}
