import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProficiencyTestEntity } from '../../proficiency/entities/proficiency-test.entity';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import { TutorOfferingStatusEnum, TutorCertificationStageEnum } from '../enums/tutor.enums';
import { ProficiencyTestService } from '../../proficiency/services/proficiency-test.service';
import { TutorService } from './tutor.service';
import { SubmitProficiencyTestInput } from '../../proficiency/dto/submit-proficiency-test.input';
import { SubmitProficiencyTestResult } from '../../proficiency/dto/submit-proficiency-test.result';
import { filterQuestionsWithoutImages } from '../../proficiency/proficiency.utils';

@Injectable()
export class TutorOfferingService {
  constructor(
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepository: Repository<TutorOfferingEntity>,
    private readonly proficiencyTestService: ProficiencyTestService,
    private readonly tutorService: TutorService,
  ) {}

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
      saved.push(await this.tutorOfferingRepository.save(tutorOffering));
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

    if (tutorOffering.status === TutorOfferingStatusEnum.pt_passed) {
      throw new BadRequestException(
        'Proficiency test already passed for this offering',
      );
    }
    if (tutorOffering.attemptsUsed >= 2) {
      throw new BadRequestException(
        'No attempts remaining. Select another offering or retry after 30 days.',
      );
    }

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
      await this.tutorService.updateCertificationStage(
        tutorId,
        TutorCertificationStageEnum.registrationPayment,
      );
    } else if (tutorOffering.attemptsUsed >= 2) {
      tutorOffering.status = TutorOfferingStatusEnum.pt_failed;
    }

    await this.tutorOfferingRepository.save(tutorOffering);

    return {
      passed,
      score,
      maxScore,
      attemptsUsed: tutorOffering.attemptsUsed,
      passPercentage: test.passPercentage,
      tutorOfferingId: tutorOffering.id,
    };
  }
}
