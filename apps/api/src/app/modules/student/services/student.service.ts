import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import {
  SchoolBoardEnum,
  StudentOnboardingStageEnum,
  StudentTypeEnum,
} from '../enums/student.enums';
import { SaveStudentParentInput } from '../dto/save-student-parent.input';
import { SaveStudentEducationInput } from '../dto/save-student-education.input';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async findByUserId(userId: number): Promise<Student | null> {
    return this.studentRepository.findOne({
      where: { userId, deleted: false },
      relations: ['user', 'addresses'],
    });
  }

  async ensureStudentExists(userId: number): Promise<Student> {
    let student = await this.studentRepository.findOne({
      where: { userId, deleted: false },
      relations: ['user', 'addresses'],
    });

    if (!student) {
      this.logger.log(`Creating student for userId: ${userId}`);
      student = this.studentRepository.create({
        userId,
        onBoardingComplete: false,
        onboardingStage: StudentOnboardingStageEnum.parent,
      });
      student = await this.studentRepository.save(student);
      student = (await this.studentRepository.findOne({
        where: { id: student.id },
        relations: ['user', 'addresses'],
      })) as Student;
      student.addresses = student.addresses ?? [];
    }

    return student;
  }

  async findOne(id: number): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id, deleted: false },
      relations: ['user', 'addresses'],
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }
    return student;
  }

  async updateOnboardingStage(
    studentId: number,
    stage: StudentOnboardingStageEnum,
  ): Promise<void> {
    await this.studentRepository.update(studentId, { onboardingStage: stage });
  }

  async saveParentStep(
    userId: number,
    input: SaveStudentParentInput,
  ): Promise<Student> {
    const student = await this.ensureStudentExists(userId);
    const name = input.parentName?.trim();
    if (!name) {
      throw new BadRequestException('Parent name is required');
    }

    student.parentRelation = input.parentRelation;
    student.parentName = name;
    student.onboardingStage = StudentOnboardingStageEnum.address;
    return this.studentRepository.save(student);
  }

  async saveEducationStep(
    userId: number,
    input: SaveStudentEducationInput,
  ): Promise<Student> {
    const student = await this.ensureStudentExists(userId);

    if (student.onboardingStage !== StudentOnboardingStageEnum.education) {
      throw new BadRequestException(
        'Complete the address step before education details',
      );
    }

    student.studentType = input.studentType;

    if (input.studentType === StudentTypeEnum.SCHOOL) {
      if (input.schoolClass == null || input.schoolClass < 1 || input.schoolClass > 12) {
        throw new BadRequestException('Class is required for school students (1–12)');
      }
      if (!input.board) {
        throw new BadRequestException('Board is required for school students');
      }
      if (input.board === SchoolBoardEnum.OTHER) {
        const other = input.boardOther?.trim();
        if (!other) {
          throw new BadRequestException('Please specify the board name');
        }
        student.boardOther = other;
      } else {
        student.boardOther = undefined;
      }
      student.schoolClass = input.schoolClass;
      student.board = input.board;
    } else {
      student.schoolClass = undefined;
      student.board = undefined;
      student.boardOther = undefined;
    }

    student.onBoardingComplete = true;
    return this.studentRepository.save(student);
  }
}
