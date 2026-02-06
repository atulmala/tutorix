import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EducationalQualification } from '../enums/educational-qualification.enum';
import { Tutor } from '../entities/tutor.entity';
import { TutorQualificationEntity } from '../entities/tutor-qualification.entity';
import { TutorCertificationStageEnum } from '../enums/tutor.enums';
import { TutorService } from './tutor.service';
import type { TutorQualificationInput } from '../dto/tutor-qualification.input';

@Injectable()
export class TutorQualificationService {
  constructor(
    @InjectRepository(TutorQualificationEntity)
    private readonly qualificationRepository: Repository<TutorQualificationEntity>,
    private readonly tutorService: TutorService,
  ) {}

  /**
   * Save qualifications for a tutor. One row per (tutorId, qualificationType).
   * Existing rows are updated; new types are inserted; types no longer in the list are soft-deleted.
   * At least one qualification must be HIGHER_SECONDARY.
   */
  async saveForTutor(
    tutorId: number,
    inputs: TutorQualificationInput[],
  ): Promise<TutorQualificationEntity[]> {
    await this.tutorService.findOne(tutorId);

    const hasHigherSecondary = inputs.some(
      (q) => q.qualificationType === EducationalQualification.HIGHER_SECONDARY,
    );
    if (!hasHigherSecondary) {
      throw new BadRequestException(
        'At least one qualification must be Higher Secondary',
      );
    }

    const types = inputs.map((q) => q.qualificationType);
    const uniqueTypes = new Set(types);
    if (uniqueTypes.size !== types.length) {
      throw new BadRequestException(
        'Duplicate qualification type: each level (e.g. Bachelors, Masters) can appear only once',
      );
    }

    const existing = await this.qualificationRepository.find({
      where: { tutorId, deleted: false },
      order: { displayOrder: 'ASC', id: 'ASC' },
    });
    const existingByType = new Map(
      existing.map((e) => [e.qualificationType, e])
    );
    const inputTypes = new Set(types);

    const toSave: TutorQualificationEntity[] = [];

    for (let index = 0; index < inputs.length; index++) {
      const input = inputs[index];
      const displayOrder = input.displayOrder ?? index;
      const degreeName =
        (input.degreeName && input.degreeName.trim()) ||
        (input.qualificationType === EducationalQualification.HIGHER_SECONDARY
          ? 'Higher Secondary'
          : undefined);
      const existingRow = existingByType.get(input.qualificationType);

      if (existingRow) {
        existingRow.boardOrUniversity = input.boardOrUniversity;
        existingRow.gradeType = input.gradeType;
        existingRow.gradeValue = input.gradeValue;
        existingRow.yearObtained = input.yearObtained;
        // If degreeName is provided (or defaulted for Higher Secondary), store it;
        // otherwise keep whatever was already stored.
        existingRow.degreeName = degreeName ?? existingRow.degreeName;
        existingRow.fieldOfStudy = input.fieldOfStudy ?? undefined;
        existingRow.displayOrder = displayOrder;
        toSave.push(existingRow);
      } else {
        const entity = this.qualificationRepository.create({
          tutor: { id: tutorId } as Tutor,
          qualificationType: input.qualificationType,
          boardOrUniversity: input.boardOrUniversity,
          gradeType: input.gradeType,
          gradeValue: input.gradeValue,
          yearObtained: input.yearObtained,
          degreeName: degreeName ?? undefined,
          fieldOfStudy: input.fieldOfStudy ?? undefined,
          displayOrder,
        });
        toSave.push(entity);
      }
    }

    const saved = await this.qualificationRepository.save(toSave);

    // Soft-delete any existing row whose type is not in the new list
    const toDelete = existing.filter((e) => !inputTypes.has(e.qualificationType));
    if (toDelete.length > 0) {
      for (const row of toDelete) {
        row.deleted = true;
      }
      await this.qualificationRepository.save(toDelete);
    }

    // Keep tutor in the qualification/experience stage.
    // Advancing to 'offerings' will be handled after experience entry is implemented.
    await this.tutorService.updateCertificationStage(
      tutorId,
      TutorCertificationStageEnum.qualificationExperience,
    );

    return saved;
  }

  async findByTutorId(tutorId: number): Promise<TutorQualificationEntity[]> {
    return this.qualificationRepository.find({
      where: { tutorId, deleted: false },
      order: { displayOrder: 'ASC', id: 'ASC' },
    });
  }
}
