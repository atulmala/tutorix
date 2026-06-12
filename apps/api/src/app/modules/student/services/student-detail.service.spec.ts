import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfilePictureService } from '../../auth/services/profile-picture.service';
import {
  ParentRelationEnum,
  SchoolBoardEnum,
  StudentOnboardingStageEnum,
  StudentTypeEnum,
} from '../enums/student.enums';
import { StudentDetailService } from './student-detail.service';
import { StudentService } from './student.service';

describe('StudentDetailService', () => {
  let service: StudentDetailService;
  let studentService: { findOne: jest.Mock };
  let profilePictureService: { resolveDisplayUrl: jest.Mock };

  beforeEach(async () => {
    studentService = { findOne: jest.fn() };
    profilePictureService = {
      resolveDisplayUrl: jest.fn().mockImplementation(async (ref?: string | null) =>
        ref ? `https://cdn.example.com/${ref}` : null,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentDetailService,
        { provide: StudentService, useValue: studentService },
        { provide: ProfilePictureService, useValue: profilePictureService },
      ],
    }).compile();

    service = module.get(StudentDetailService);
  });

  it('maps student detail and resolves profile picture URLs', async () => {
    studentService.findOne.mockResolvedValue({
      id: 3,
      onboardingStage: StudentOnboardingStageEnum.education,
      onboardingStageEnteredAt: new Date('2026-06-01'),
      onBoardingComplete: false,
      parentRelation: ParentRelationEnum.MOTHER,
      parentName: 'Jane Doe',
      studentType: StudentTypeEnum.SCHOOL,
      schoolClass: 10,
      board: SchoolBoardEnum.CBSE,
      boardOther: null,
      user: {
        id: 69,
        firstName: 'Kim',
        lastName: 'Shina',
        email: 'kim@gmail.com',
        mobileCountryCode: '+91',
        mobileNumber: '9863000038',
        createdDate: new Date('2026-06-10'),
        profilePicture: 'profile_pic/student/69/profile_pic_thumb_sm.webp',
        profilePictureThumbnailMedium: null,
        profilePictureThumbnailLarge: null,
        profilePictureOriginalUrl: null,
      },
      addresses: [
        {
          id: 1,
          fullAddress: '123 Main St',
          primary: true,
        },
      ],
    });

    const result = await service.getStudentDetail(3);

    expect(result.id).toBe(3);
    expect(result.parentName).toBe('Jane Doe');
    expect(result.user?.profilePicture).toBe(
      'https://cdn.example.com/profile_pic/student/69/profile_pic_thumb_sm.webp',
    );
    expect(profilePictureService.resolveDisplayUrl).toHaveBeenCalledWith(
      'profile_pic/student/69/profile_pic_thumb_sm.webp',
    );
    expect(result.addresses).toHaveLength(1);
  });

  it('propagates not found from student service', async () => {
    studentService.findOne.mockRejectedValue(
      new NotFoundException('Student with ID 99 not found'),
    );

    await expect(service.getStudentDetail(99)).rejects.toThrow(NotFoundException);
  });
});
