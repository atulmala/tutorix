import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { NotFoundException } from '@nestjs/common';
import { ProficiencyTestEntity } from '../entities/proficiency-test.entity';
import { ProficiencyTestService } from '../services/proficiency-test.service';

@Resolver(() => ProficiencyTestEntity)
export class ProficiencyResolver {
  constructor(private readonly proficiencyTestService: ProficiencyTestService) {}

  @Query(() => ProficiencyTestEntity, {
    name: 'proficiencyTest',
    nullable: true,
    description: 'Get proficiency test by ID with questions and answers',
  })
  async proficiencyTest(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<ProficiencyTestEntity | null> {
    return this.proficiencyTestService.getTestWithQuestionsForTaker(id);
  }

  @Query(() => ProficiencyTestEntity, {
    name: 'proficiencyTestForOffering',
    description: 'Get proficiency test for a leaf offering (for tutor to take)',
  })
  async proficiencyTestForOffering(
    @Args('offeringId', { type: () => ID }) offeringId: number,
  ): Promise<ProficiencyTestEntity> {
    const test = await this.proficiencyTestService.getTestForOffering(offeringId);
    const testWithQuestions =
      await this.proficiencyTestService.getTestWithQuestionsForTaker(test.id);
    if (!testWithQuestions) {
      throw new NotFoundException(
        `Proficiency test ${test.id} not found or has no questions`,
      );
    }
    return testWithQuestions;
  }
}
