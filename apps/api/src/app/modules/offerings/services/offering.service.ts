import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferingEntity } from '../entities/offering.entity';

@Injectable()
export class OfferingService {
  constructor(
    @InjectRepository(OfferingEntity)
    private readonly offeringRepository: Repository<OfferingEntity>,
  ) {}

  /**
   * Find all offerings (excludes soft-deleted).
   * Returns flat list ordered by level, display_order, id.
   * Frontend builds the tree from parentOffering/rootOffering relations.
   */
  async findAll(): Promise<OfferingEntity[]> {
    return this.offeringRepository.find({
      where: { deleted: false },
      relations: ['parentOffering', 'rootOffering'],
      order: { level: 'ASC', order: 'ASC', id: 'ASC' },
    });
  }
}
