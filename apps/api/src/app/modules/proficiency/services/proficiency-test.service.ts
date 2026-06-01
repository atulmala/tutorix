import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProficiencyTestEntity } from '../entities/proficiency-test.entity';
import { PTQuestionEntity } from '../entities/pt-question.entity';
import { QuestionDifficultyEnum } from '../enums/question-difficulty.enum';
import { filterQuestionsWithoutImages } from '../proficiency.utils';

const QUESTIONS_PER_TEST = 30;

/**
 * Fisher-Yates shuffle.
 */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

@Injectable()
export class ProficiencyTestService {
  constructor(
    @InjectRepository(ProficiencyTestEntity)
    private readonly proficiencyTestRepository: Repository<ProficiencyTestEntity>,
  ) {}

  /**
   * Returns a proficiency test with its questions and answers loaded.
   * Questions that contain images (<img>) are excluded so only text-only
   * questions are shown during the test (legacy image assets were not backed up).
   */
  async getTestWithQuestionsForTaker(id: number): Promise<ProficiencyTestEntity | null> {
    const test = await this.proficiencyTestRepository.findOne({
      where: { id },
      relations: ['questions', 'questions.answers'],
    });
    if (!test?.questions) return test;
    test.questions = filterQuestionsWithoutImages(test.questions);
    return test;
  }

  /**
   * Returns a proficiency test with exactly 30 randomly selected questions,
   * with a good mix of low, medium, and high difficulty.
   */
  async getTestWith30QuestionsForTaker(
    id: number,
  ): Promise<ProficiencyTestEntity | null> {
    const test = await this.getTestWithQuestionsForTaker(id);
    if (!test?.questions?.length) return test;

    const low = shuffle(
      test.questions.filter((q) => q.difficulty === QuestionDifficultyEnum.LOW),
    );
    const med = shuffle(
      test.questions.filter(
        (q) => q.difficulty === QuestionDifficultyEnum.MEDIUM,
      ),
    );
    const high = shuffle(
      test.questions.filter((q) => q.difficulty === QuestionDifficultyEnum.HIGH),
    );

    const targetPerLevel = 10;
    const selected: PTQuestionEntity[] = [];

    for (let i = 0; i < targetPerLevel; i++) {
      if (low[i]) selected.push(low[i]);
      if (med[i]) selected.push(med[i]);
      if (high[i]) selected.push(high[i]);
    }

    const used = new Set(selected.map((q) => q.id));
    const remaining = shuffle(
      test.questions.filter((q) => !used.has(q.id)),
    );
    for (const q of remaining) {
      if (selected.length >= QUESTIONS_PER_TEST) break;
      selected.push(q);
    }

    test.questions = shuffle(selected).slice(0, QUESTIONS_PER_TEST);
    return test;
  }

  /**
   * Find a proficiency test that applies to the given leaf offering.
   * One PT can map to many offerings (e.g. common PT for CBSE Class 4 & 5 Maths).
   * @throws NotFoundException if no PT found for the offering
   */
  /**
   * Load proficiency tests with linked leaf offerings (for class-range labels).
   */
  async findByIdsWithOfferings(ids: number[]): Promise<ProficiencyTestEntity[]> {
    const uniqueIds = [...new Set(ids.filter((id) => id > 0))];
    if (uniqueIds.length === 0) {
      return [];
    }

    return this.proficiencyTestRepository.find({
      where: { id: In(uniqueIds), deleted: false },
      relations: ['offerings'],
    });
  }

  async getTestForOffering(offeringId: number): Promise<ProficiencyTestEntity> {
    const test = await this.proficiencyTestRepository
      .createQueryBuilder('pt')
      .innerJoin('pt.offerings', 'o', 'o.id = :offeringId', { offeringId })
      .where('pt.deleted = :deleted', { deleted: false })
      .andWhere('pt.active = :active', { active: true })
      .getOne();

    if (!test) {
      throw new NotFoundException(
        `No proficiency test found for offering ID ${offeringId}`,
      );
    }
    return test;
  }

  /**
   * All non-deleted proficiency tests with linked offerings and question counts (admin list).
   */
  async findAllForAdmin(): Promise<ProficiencyTestEntity[]> {
    return this.proficiencyTestRepository
      .createQueryBuilder('pt')
      .leftJoinAndSelect(
        'pt.offerings',
        'offering',
        'offering.deleted = :offeringDeleted',
        { offeringDeleted: false },
      )
      .loadRelationCountAndMap(
        'pt.questionCount',
        'pt.questions',
        'question',
        (qb) =>
          qb.where('question.deleted = :questionDeleted', {
            questionDeleted: false,
          }),
      )
      .where('pt.deleted = :deleted', { deleted: false })
      .orderBy('pt.id', 'ASC')
      .getMany();
  }

  /**
   * Full question pool with answers for admin review (includes correct flags).
   */
  async getTestWithAllQuestionsForAdmin(
    id: number,
  ): Promise<ProficiencyTestEntity> {
    const test = await this.proficiencyTestRepository.findOne({
      where: { id, deleted: false },
      relations: ['questions', 'questions.answers'],
    });

    if (!test) {
      throw new NotFoundException(`Proficiency test ${id} not found`);
    }

    test.questions = (test.questions ?? [])
      .filter((question) => !question.deleted)
      .sort((a, b) => a.id - b.id);

    for (const question of test.questions) {
      question.answers = (question.answers ?? [])
        .filter((answer) => !answer.deleted)
        .sort((a, b) => a.id - b.id);
    }

    return test;
  }
}

