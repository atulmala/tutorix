import { Injectable } from '@nestjs/common';
import { AdminStudentDetail } from '../../admin/dto/admin-student-detail.dto';
import { ProfilePictureService } from '../../auth/services/profile-picture.service';
import { StudentService } from './student.service';

@Injectable()
export class StudentDetailService {
  constructor(
    private readonly studentService: StudentService,
    private readonly profilePictureService: ProfilePictureService,
  ) {}

  async getStudentDetail(studentId: number): Promise<AdminStudentDetail> {
    const student = await this.studentService.findOne(studentId);
    const user = student.user;

    const [
      profilePicture,
      profilePictureThumbnailMedium,
      profilePictureThumbnailLarge,
      profilePictureOriginalUrl,
    ] = user
      ? await Promise.all([
          this.profilePictureService.resolveDisplayUrl(user.profilePicture),
          this.profilePictureService.resolveDisplayUrl(
            user.profilePictureThumbnailMedium,
          ),
          this.profilePictureService.resolveDisplayUrl(
            user.profilePictureThumbnailLarge,
          ),
          this.profilePictureService.resolveDisplayUrl(user.profilePictureOriginalUrl),
        ])
      : [null, null, null, null];

    return {
      id: student.id,
      onboardingStage: student.onboardingStage,
      onboardingStageEnteredAt: student.onboardingStageEnteredAt,
      onBoardingComplete: student.onBoardingComplete,
      parentRelation: student.parentRelation,
      parentName: student.parentName,
      studentType: student.studentType,
      schoolClass: student.schoolClass,
      board: student.board,
      boardOther: student.boardOther,
      user: user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            mobile: user.mobile,
            mobileCountryCode: user.mobileCountryCode,
            mobileNumber: user.mobileNumber,
            createdDate: user.createdDate,
            profilePicture: profilePicture ?? undefined,
            profilePictureThumbnailMedium: profilePictureThumbnailMedium ?? undefined,
            profilePictureThumbnailLarge: profilePictureThumbnailLarge ?? undefined,
            profilePictureOriginalUrl: profilePictureOriginalUrl ?? undefined,
          }
        : undefined,
      addresses: student.addresses ?? [],
    };
  }

}
