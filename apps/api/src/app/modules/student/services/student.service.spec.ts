import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StudentService } from './student.service';
import { Student } from '../entities/student.entity';
import {
  ParentRelationEnum,
  SchoolBoardEnum,
  StudentOnboardingStageEnum,
  StudentTypeEnum,
} from '../enums/student.enums';

describe('StudentService', () => {
  let service: StudentService;

  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: getRepositoryToken(Student), useValue: mockRepo },
      ],
    }).compile();
    service = module.get(StudentService);
  });

  it('ensureStudentExists creates student when missing', async () => {
    const created = {
      id: 1,
      userId: 10,
      onBoardingComplete: false,
      onboardingStage: StudentOnboardingStageEnum.parent,
      addresses: [],
    };
    mockRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...created, user: { id: 10 } });
    mockRepo.create.mockReturnValue(created);
    mockRepo.save.mockResolvedValue(created);

    const result = await service.ensureStudentExists(10);
    expect(result.userId).toBe(10);
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('saveEducationStep requires class and board for school students', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 10,
      onboardingStage: StudentOnboardingStageEnum.education,
    });

    await expect(
      service.saveEducationStep(10, {
        studentType: StudentTypeEnum.SCHOOL,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('saveEducationStep clears class/board for non-school types', async () => {
    const student = {
      id: 1,
      userId: 10,
      onboardingStage: StudentOnboardingStageEnum.education,
      schoolClass: 10,
      board: SchoolBoardEnum.CBSE,
      boardOther: 'x',
    };
    mockRepo.findOne.mockResolvedValue(student);
    mockRepo.save.mockImplementation(async (s) => s);

    const result = await service.saveEducationStep(10, {
      studentType: StudentTypeEnum.COLLEGE,
    });

    expect(result.onBoardingComplete).toBe(true);
    expect(result.schoolClass).toBeUndefined();
    expect(result.board).toBeUndefined();
    expect(result.boardOther).toBeUndefined();
  });

  it('saveParentStep advances to address stage', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 10,
      onboardingStage: StudentOnboardingStageEnum.parent,
      addresses: [],
    });
    mockRepo.save.mockImplementation(async (s) => s);

    const result = await service.saveParentStep(10, {
      parentRelation: ParentRelationEnum.FATHER,
      parentName: 'Raj Kumar',
    });

    expect(result.onboardingStage).toBe(StudentOnboardingStageEnum.address);
    expect(result.parentName).toBe('Raj Kumar');
  });
});
