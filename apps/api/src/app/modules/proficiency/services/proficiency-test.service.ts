import { Injectable } from '@nestjs/common';
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
}

