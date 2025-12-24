import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tutor } from '../entities/tutor.entity';
import { CreateTutorInput } from '../dto/create-tutor.input.dto';
import { UpdateTutorInput } from '../dto/update-tutor.input.dto';

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
   * Create a new tutor
   */
  async create(createTutorInput: CreateTutorInput): Promise<Tutor> {
    const tutor = this.tutorRepository.create(createTutorInput);
    return this.tutorRepository.save(tutor);
  }

  /**
   * Update an existing tutor
   */
  async update(id: number, updateTutorInput: UpdateTutorInput): Promise<Tutor> {
    const tutor = await this.findOne(id);
    Object.assign(tutor, updateTutorInput);
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

