import { Resolver, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { ExperienceEntity } from '../entities/experience.entity';
import { ExperienceService } from '../services/experience.service';
import { SaveTutorExperiencesInput } from '../dto/save-tutor-experiences.input';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { TutorService } from '../../tutor/services/tutor.service';

@Resolver(() => Tutor)
export class ExperienceResolver {
  constructor(
    private readonly experienceService: ExperienceService,
    private readonly tutorService: TutorService,
  ) {}

  @ResolveField(() => [ExperienceEntity], {
    description: 'Experiences for this tutor (excludes soft-deleted)',
  })
  async experiences(@Parent() tutor: Tutor): Promise<ExperienceEntity[]> {
    return this.experienceService.findByTutorId(tutor.id);
  }

  @Mutation(() => [ExperienceEntity], {
    description: 'Save experiences for the authenticated tutor (replaces existing)',
  })
  @UseGuards(JwtAuthGuard)
  async saveTutorExperiences(
    @CurrentUser() user: User,
    @Args('input') input: SaveTutorExperiencesInput,
  ): Promise<ExperienceEntity[]> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new Error('Tutor profile not found for this user');
    }
    return this.experienceService.saveForTutor(tutor.id, input);
  }
}
