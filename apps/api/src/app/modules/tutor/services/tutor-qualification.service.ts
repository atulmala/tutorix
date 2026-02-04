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
   * Replace all qualifications for a tutor with the given list.
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

    await this.qualificationRepository.softDelete({ tutorId });

    const entities = inputs.map((input, index) =>
      this.qualificationRepository.create({
        tutor: { id: tutorId } as Tutor,
        qualificationType: input.qualificationType,
        boardOrUniversity: input.boardOrUniversity,
        gradeType: input.gradeType,
        gradeValue: input.gradeValue,
        yearObtained: input.yearObtained,
        fieldOfStudy: input.fieldOfStudy ?? undefined,
        displayOrder: input.displayOrder ?? index,
      }),
    );

    const saved = await this.qualificationRepository.save(entities);

    await this.tutorService.updateCertificationStage(
      tutorId,
      TutorCertificationStageEnum.offerings,
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
