import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Tutor } from '../entities/tutor.entity';
import { TutorQualificationEntity } from '../entities/tutor-qualification.entity';
import { TutorService } from '../services/tutor.service';
import { TutorQualificationService } from '../services/tutor-qualification.service';
import { SaveTutorQualificationsInput } from '../dto/tutor-qualification.input';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';

@Resolver(() => Tutor)
export class TutorResolver {
  constructor(
    private readonly tutorService: TutorService,
    private readonly tutorQualificationService: TutorQualificationService,
  ) {}

  /**
   * Query: Get all tutors
   */
  @Query(() => [Tutor], { name: 'tutors', description: 'Get all active tutors' })
  async findAll(): Promise<Tutor[]> {
    return this.tutorService.findAll();
  }

  /**
   * Query: Get tutor by ID
   * @throws NotFoundException if tutor not found
   */
  @Query(() => Tutor, { name: 'tutor', nullable: true, description: 'Get tutor by ID' })
  async findOne(@Args('id', { type: () => ID }) id: number): Promise<Tutor> {
    return this.tutorService.findOne(id);
  }

  /**
   * Query: Get current authenticated tutor's profile
   * Creates tutor if it doesn't exist
   */
  @Query(() => Tutor, { name: 'myTutorProfile', nullable: true, description: 'Get current tutor profile, creates if doesn\'t exist' })
  @UseGuards(JwtAuthGuard)
  async getMyTutorProfile(@CurrentUser() user: User): Promise<Tutor | null> {
    // Only create tutor if user role is TUTOR
    if (user.role !== 'TUTOR') {
      return null;
    }
    
    // Ensure tutor exists (create if doesn't exist)
    return this.tutorService.ensureTutorExists(user.id);
  }

  /**
   * Mutation: Save tutor qualifications (replaces all for current tutor)
   * At least one qualification must be Higher Secondary.
   */
  @Mutation(() => [TutorQualificationEntity], {
    description: 'Save qualifications for the authenticated tutor (replaces existing)',
  })
  @UseGuards(JwtAuthGuard)
  async saveTutorQualifications(
    @CurrentUser() user: User,
    @Args('input') input: SaveTutorQualificationsInput,
  ): Promise<TutorQualificationEntity[]> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new Error('Tutor profile not found for this user');
    }
    return this.tutorQualificationService.saveForTutor(tutor.id, input.qualifications);
  }

  /**
   * Mutation: Delete a tutor (soft delete)
   */
  @Mutation(() => Boolean, { description: 'Delete a tutor (soft delete)' })
  async removeTutor(@Args('id', { type: () => ID }) id: number): Promise<boolean> {
    return this.tutorService.remove(id);
  }
}

