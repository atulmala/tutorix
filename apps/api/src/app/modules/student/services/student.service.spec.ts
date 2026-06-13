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
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        onboardingStage: StudentOnboardingStageEnum.parent,
        onboardingStageEnteredAt: expect.any(Date),
      }),
    );
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

  it('saveParentStep advances to address stage during onboarding', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 10,
      onBoardingComplete: false,
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
    expect(result.onboardingStageEnteredAt).toBeInstanceOf(Date);
  });

  it('saveParentStep does not change stage when onboarding is complete', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 10,
      onBoardingComplete: true,
      onboardingStage: StudentOnboardingStageEnum.education,
      addresses: [],
    });
    mockRepo.save.mockImplementation(async (s) => s);

    const result = await service.saveParentStep(10, {
      parentRelation: ParentRelationEnum.MOTHER,
      parentName: 'Updated Parent',
    });

    expect(result.onboardingStage).toBe(StudentOnboardingStageEnum.education);
    expect(result.parentName).toBe('Updated Parent');
    expect(result.onboardingStageEnteredAt).toBeUndefined();
  });

  it('saveEducationStep updates fields when onboarding is already complete', async () => {
    const student = {
      id: 1,
      userId: 10,
      onBoardingComplete: true,
      onboardingStage: StudentOnboardingStageEnum.education,
      studentType: StudentTypeEnum.SCHOOL,
      schoolClass: 8,
      board: SchoolBoardEnum.CBSE,
    };
    mockRepo.findOne.mockResolvedValue(student);
    mockRepo.save.mockImplementation(async (s) => s);

    const result = await service.saveEducationStep(10, {
      studentType: StudentTypeEnum.COLLEGE,
    });

    expect(result.studentType).toBe(StudentTypeEnum.COLLEGE);
    expect(result.onBoardingComplete).toBe(true);
    expect(result.schoolClass).toBeUndefined();
    expect(result.board).toBeUndefined();
  });

  it('saveEducationStep sets onboardingStageEnteredAt when completing', async () => {
    const student = {
      id: 1,
      userId: 10,
      onboardingStage: StudentOnboardingStageEnum.education,
    };
    mockRepo.findOne.mockResolvedValue(student);
    mockRepo.save.mockImplementation(async (s) => s);

    const result = await service.saveEducationStep(10, {
      studentType: StudentTypeEnum.COLLEGE,
    });

    expect(result.onBoardingComplete).toBe(true);
    expect(result.onboardingStageEnteredAt).toBeInstanceOf(Date);
  });

  it('updateOnboardingStage sets onboardingStageEnteredAt when stage changes', async () => {
    const student = {
      id: 1,
      userId: 10,
      onboardingStage: StudentOnboardingStageEnum.address,
    };
    mockRepo.findOne.mockResolvedValue(student);
    mockRepo.save.mockImplementation(async (s) => s);

    await service.updateOnboardingStage(1, StudentOnboardingStageEnum.education);

    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        onboardingStage: StudentOnboardingStageEnum.education,
        onboardingStageEnteredAt: expect.any(Date),
      }),
    );
  });

  it('updateOnboardingStage skips save when stage is unchanged', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 10,
      onboardingStage: StudentOnboardingStageEnum.education,
    });

    await service.updateOnboardingStage(1, StudentOnboardingStageEnum.education);

    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
