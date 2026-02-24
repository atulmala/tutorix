import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProficiencyTestEntity } from '../entities/proficiency-test.entity';

@Injectable()
export class ProficiencyTestService {
  constructor(
    @InjectRepository(ProficiencyTestEntity)
    private readonly proficiencyTestRepository: Repository<ProficiencyTestEntity>,
  ) {}

  // TODO: implement proficiency test business logic
}

