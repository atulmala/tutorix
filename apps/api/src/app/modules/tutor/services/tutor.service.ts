import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tutor } from '../entities/tutor.entity';

@Injectable()
export class TutorService {
  constructor(
    @InjectRepository(Tutor)
    private readonly tutorRepository: Repository<Tutor>,
  ) {}

  /**
   * Find all active tutors
   */
  async findAll(): Promise<Tutor[]> {
    return this.tutorRepository.find({
      where: { deleted: false, active: true },
      order: { createdDate: 'DESC' },
    });
  }

  /**
   * Find a tutor by ID
   * @throws NotFoundException if tutor not found
   */
  async findOne(id: number): Promise<Tutor> {
    const tutor = await this.tutorRepository.findOne({
      where: { id, deleted: false },
    });

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID ${id} not found`);
    }

    return tutor;
  }

  /**
   * Find a tutor by user ID
   * @returns Tutor or null if not found
   */
  async findByUserId(userId: number): Promise<Tutor | null> {
    return this.tutorRepository.findOne({
      where: { userId, deleted: false },
      relations: ['addresses'],
    });
  }

  /**
   * Ensure tutor exists for a user (create if doesn't exist)
   * @returns Tutor (existing or newly created) with addresses loaded
   */
  async ensureTutorExists(userId: number): Promise<Tutor> {
    let tutor = await this.tutorRepository.findOne({
      where: { userId, deleted: false },
      relations: ['addresses'],
    });
    
    if (!tutor) {
      // Create new tutor
      tutor = this.tutorRepository.create({
        userId,
        onBoardingComplete: false,
        regFeePaid: false,
      });
      tutor = await this.tutorRepository.save(tutor);
      
      // Reload with relations
      tutor = await this.tutorRepository.findOne({
        where: { id: tutor.id },
        relations: ['addresses'],
      }) || tutor;
    }
    
    return tutor;
  }

  /**
   * Update tutor onboarding status
   */
  async updateOnboardingStatus(tutorId: number, onBoardingComplete: boolean): Promise<Tutor> {
    const tutor = await this.findOne(tutorId);
    tutor.onBoardingComplete = onBoardingComplete;
    return this.tutorRepository.save(tutor);
  }

  /**
   * Soft delete a tutor (sets deleted = true)
   */
  async remove(id: number): Promise<boolean> {
    const tutor = await this.findOne(id);
    tutor.deleted = true;
    await this.tutorRepository.save(tutor);
    return true;
  }
}

