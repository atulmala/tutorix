import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { ExperienceEntity } from '../entities/experience.entity';
import { TutorCertificationStageEnum } from '../../tutor/enums/tutor.enums';
import { TutorService } from '../../tutor/services/tutor.service';
import type { SaveTutorExperiencesInput } from '../dto/save-tutor-experiences.input';

@Injectable()
export class ExperienceService {
  constructor(
    @InjectRepository(ExperienceEntity)
    private readonly experienceRepository: Repository<ExperienceEntity>,
    private readonly tutorService: TutorService,
  ) {}

  /**
   * Save experiences for a tutor. Replaces existing list.
   * Updates tutor.yearsOfExperience and optionally advances certification stage.
   */
  async saveForTutor(
    tutorId: number,
    input: SaveTutorExperiencesInput,
  ): Promise<ExperienceEntity[]> {
    await this.tutorService.findOne(tutorId);

    const existing = await this.experienceRepository.find({
      where: { tutor: { id: tutorId }, deleted: false },
      order: { startDate: 'DESC', id: 'ASC' },
    });
    const existingById = new Map(existing.map((e) => [e.id, e]));

    const toSave: ExperienceEntity[] = [];
    const keptIds = new Set<number>();

    for (let index = 0; index < input.experiences.length; index++) {
      const exp = input.experiences[index];
      const startDate = new Date(exp.startDate);
      const endDate = exp.endDate ? new Date(exp.endDate) : undefined;

      const existingRow = exp.id ? existingById.get(exp.id) : undefined;

      if (existingRow) {
        existingRow.jobTitle = exp.jobTitle.trim();
        existingRow.employerName = exp.employerName?.trim() || undefined;
        existingRow.employerAddress = exp.employerAddress?.trim() || undefined;
        existingRow.employmentType = exp.employmentType;
        existingRow.startDate = startDate;
        existingRow.endDate = exp.isCurrent ? undefined : endDate;
        existingRow.isCurrent = exp.isCurrent ?? false;
        toSave.push(existingRow);
        keptIds.add(existingRow.id);
      } else {
        const entity = this.experienceRepository.create({
          tutor: { id: tutorId } as Tutor,
          jobTitle: exp.jobTitle.trim(),
          employerName: exp.employerName?.trim() || undefined,
          employerAddress: exp.employerAddress?.trim() || undefined,
          employmentType: exp.employmentType,
          startDate,
          endDate: exp.isCurrent ? undefined : endDate,
          isCurrent: exp.isCurrent ?? false,
        });
        toSave.push(entity);
      }
    }

    const saved = await this.experienceRepository.save(toSave);

    const toDelete = existing.filter((e) => !keptIds.has(e.id));
    if (toDelete.length > 0) {
      for (const row of toDelete) {
        row.deleted = true;
      }
      await this.experienceRepository.save(toDelete);
    }

    await this.tutorService.updateYearsOfExperience(
      tutorId,
      input.yearsOfExperience,
    );

    const shouldAdvance = input.advanceToNextStep !== false;
    if (shouldAdvance) {
      await this.tutorService.updateCertificationStage(
        tutorId,
        TutorCertificationStageEnum.offerings,
      );
    }

    return saved;
  }

  async findByTutorId(tutorId: number): Promise<ExperienceEntity[]> {
    return this.experienceRepository.find({
      where: { tutor: { id: tutorId }, deleted: false },
      order: { startDate: 'DESC', id: 'ASC' },
    });
  }
}
