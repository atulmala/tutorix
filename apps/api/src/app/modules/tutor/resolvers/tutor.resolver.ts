import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Tutor } from '../entities/tutor.entity';
import { TutorService } from '../services/tutor.service';
import { CreateTutorInput } from '../dto/create-tutor.input.dto';
import { UpdateTutorInput } from '../dto/update-tutor.input.dto';

@Resolver(() => Tutor)
export class TutorResolver {
  constructor(private readonly tutorService: TutorService) {}

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
   * Mutation: Create a new tutor
   */
  @Mutation(() => Tutor, { description: 'Create a new tutor' })
  async createTutor(
    @Args('input') createTutorInput: CreateTutorInput,
  ): Promise<Tutor> {
    return this.tutorService.create(createTutorInput);
  }

  /**
   * Mutation: Update an existing tutor
   */
  @Mutation(() => Tutor, { description: 'Update an existing tutor' })
  async updateTutor(
    @Args('id', { type: () => ID }) id: number,
    @Args('input') updateTutorInput: UpdateTutorInput,
  ): Promise<Tutor> {
    return this.tutorService.update(id, updateTutorInput);
  }

  /**
   * Mutation: Delete a tutor (soft delete)
   */
  @Mutation(() => Boolean, { description: 'Delete a tutor (soft delete)' })
  async removeTutor(@Args('id', { type: () => ID }) id: number): Promise<boolean> {
    return this.tutorService.remove(id);
  }
}

