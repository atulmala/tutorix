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
   * Soft delete a tutor (sets deleted = true)
   */
  async remove(id: number): Promise<boolean> {
    const tutor = await this.findOne(id);
    tutor.deleted = true;
    await this.tutorRepository.save(tutor);
    return true;
  }
}

