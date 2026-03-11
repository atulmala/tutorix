import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProficiencyTestEntity } from '../entities/proficiency-test.entity';
import { filterQuestionsWithoutImages } from '../proficiency.utils';

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
   * Find a proficiency test that applies to the given leaf offering.
   * One PT can map to many offerings (e.g. common PT for CBSE Class 4 & 5 Maths).
   * @throws NotFoundException if no PT found for the offering
   */
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
}

