import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { AdminTutorDetail } from '../../admin/dto/admin-tutor-detail.dto';
import { AdminTutorDocumentDetail } from '../../admin/dto/admin-tutor-document-detail.dto';
import { AdminTutorDocumentScreeningDetail } from '../../admin/dto/admin-tutor-document-screening-detail.dto';
import { AdminTutorOfferingDetail } from '../../admin/dto/admin-tutor-offering-detail.dto';
import { DocumentScreeningEntity } from '../../document/entities/document-screening.entity';
import { DocumentEntity } from '../../document/entities/document.entity';
import { DocumentScreeningService } from '../../document/services/document-screening.service';
import { DocumentService } from '../../document/services/document.service';
import { ExperienceService } from '../../experience/services/experience.service';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import { TutorOfferingRateCardEntity } from '../../tutor-rate-card/entities/tutor-offering-rate-card.entity';
import { TutorOfferingService } from './tutor-offering.service';
import { TutorQualificationService } from './tutor-qualification.service';
import { TutorService } from './tutor.service';
import { UserBankDetailsService } from '../../user-bank-details/services/user-bank-details.service';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import { TutorCalendarService } from '../../tutor-calendar/services/tutor-calendar.service';
import { OfferingService } from '../../offerings/services/offering.service';
import { OfferingEntity } from '../../offerings/entities/offering.entity';
import { ProficiencyTestService } from '../../proficiency/services/proficiency-test.service';
import {
  formatTutorOfferingFullLabel,
  type OfferingNodeForLabel,
} from '@tutorix/shared-utils';

const PT_MAX_ATTEMPTS = 2;

@Injectable()
export class TutorDetailService {
  constructor(
    private readonly tutorService: TutorService,
    private readonly tutorQualificationService: TutorQualificationService,
    private readonly experienceService: ExperienceService,
    private readonly tutorOfferingService: TutorOfferingService,
    private readonly documentService: DocumentService,
    private readonly documentScreeningService: DocumentScreeningService,
    private readonly userBankDetailsService: UserBankDetailsService,
    private readonly tutorRateCardService: TutorRateCardService,
    private readonly tutorCalendarService: TutorCalendarService,
    private readonly offeringService: OfferingService,
    private readonly proficiencyTestService: ProficiencyTestService,
  ) {}

  async getTutorDetail(tutorId: number): Promise<AdminTutorDetail> {
    const [tutor, qualifications, experiences, offerings, documents] =
      await Promise.all([
        this.tutorService.findOneWithProfile(tutorId),
        this.tutorQualificationService.findByTutorId(tutorId),
        this.experienceService.findByTutorId(tutorId),
        this.tutorOfferingService.findByTutorId(tutorId),
        this.documentService.findOnboardingDocumentsByTutorId(tutorId),
      ]);

    const screeningMap = await this.documentScreeningService.findByDocumentIds(
      documents.map((doc) => doc.id),
    );

    const ptIds = [...new Set(offerings.map((o) => o.proficiencyTestId))];

    const [rateCardMap, catalogOfferings, proficiencyTests] = await Promise.all([
      this.tutorRateCardService.findByTutorOfferingIds(
        offerings.map((offering) => offering.id),
      ),
      this.offeringService.findAll(),
      this.proficiencyTestService.findByIdsWithOfferings(ptIds),
    ]);
    const offeringsById = new Map(
      catalogOfferings.map((o) => [o.id, this.toOfferingNodeForLabel(o)]),
    );
    const ptOfferingIdsByPtId = new Map(
      proficiencyTests.map((pt) => [
        pt.id,
        (pt.offerings ?? []).filter((o) => !o.deleted).map((o) => o.id),
      ]),
    );

    const documentDetails = await Promise.all(
      documents.map((doc) =>
        this.mapDocumentDetail(doc, screeningMap.get(doc.id)),
      ),
    );

    const user = tutor.user;
    const bankDetailsEntity = user
      ? await this.userBankDetailsService.findByUserId(user.id)
      : null;
    const bankDetails = this.userBankDetailsService.mapToGraphql(bankDetailsEntity);
    const canSetAvailability =
      await this.tutorCalendarService.tutorHasCompleteRateCard(tutor.id);

    return {
      id: tutor.id,
      certificationStage: tutor.certificationStage,
      yearsOfExperience: tutor.yearsOfExperience,
      regFeePaid: tutor.regFeePaid,
      testTutor: tutor.testTutor,
      canSetAvailability,
      availabilityConfiguredAt: tutor.availabilityConfiguredAt,
      regFeeAmount: tutor.regFeeAmount,
      regFeeAmountToBePaid: tutor.regFeeAmountToBePaid,
      regFeeDate: tutor.regFeeDate,
      user: user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            mobile: user.mobile,
            mobileCountryCode: user.mobileCountryCode,
            mobileNumber: user.mobileNumber,
            createdDate: user.createdDate,
            bankDetails,
          }
        : undefined,
      addresses: tutor.addresses ?? [],
      qualifications,
      experiences,
      offerings: offerings.map((offering) =>
        this.mapOfferingDetail(
          offering,
          rateCardMap.get(offering.id) ?? null,
          offeringsById,
          ptOfferingIdsByPtId.get(offering.proficiencyTestId),
        ),
      ),
      documents: documentDetails,
    };
  }

  async getMyTutorDetail(user: User): Promise<AdminTutorDetail> {
    if (user.role !== UserRole.TUTOR) {
      throw new ForbiddenException('Only tutors can access tutor detail');
    }

    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found for this user');
    }

    if (!tutor.onBoardingComplete || !tutor.onboardingCelebrationSeen) {
      throw new ForbiddenException(
        'Tutor detail is available after onboarding is complete and the welcome message is acknowledged',
      );
    }

    return this.getTutorDetail(tutor.id);
  }

  async mapDocumentDetail(
    doc: DocumentEntity,
    screening?: DocumentScreeningEntity,
  ): Promise<AdminTutorDocumentDetail> {
    const [previewUrl, viewUrl] = await Promise.all([
      this.documentService.resolvePreviewUrlForAdmin(doc),
      this.documentService.resolveViewUrlForAdmin(doc),
    ]);

    return {
      id: doc.id,
      name: doc.name,
      documentType: doc.documentType,
      filename: doc.filename,
      mimeType: doc.mimeType,
      previewUrl: previewUrl ?? undefined,
      viewUrl: viewUrl ?? undefined,
      screening: screening ? this.mapScreeningDetail(screening) : undefined,
      createdDate: doc.createdDate,
    };
  }

  private toOfferingNodeForLabel(offering: OfferingEntity): OfferingNodeForLabel {
    return {
      id: offering.id,
      displayName: offering.displayName,
      level: offering.level,
      mediumOfInstruction: offering.mediumOfInstruction,
      parentOffering: offering.parentOffering
        ? { id: offering.parentOffering.id }
        : undefined,
      rootOffering: offering.rootOffering
        ? { id: offering.rootOffering.id, displayName: offering.rootOffering.displayName }
        : undefined,
    };
  }

  private mapOfferingDetail(
    offering: TutorOfferingEntity,
    rateCardEntity: TutorOfferingRateCardEntity | null,
    offeringsById: Map<number, OfferingNodeForLabel>,
    proficiencyTestOfferingIds?: number[],
  ): AdminTutorOfferingDetail {
    const catalogNode = offeringsById.get(offering.offeringId);
    const leaf = offering.offering
      ? {
          ...(catalogNode ?? this.toOfferingNodeForLabel(offering.offering)),
          displayName:
            catalogNode?.displayName ??
            offering.offering.displayName ??
            offering.offering.name ??
            'Offering',
        }
      : catalogNode;

    const offeringFullLabel = formatTutorOfferingFullLabel(leaf, offeringsById, {
      proficiencyTestOfferingIds,
    });

    return {
      id: offering.id,
      offeringId: offering.offeringId,
      offeringName: offering.offering?.name,
      offeringDisplayName: offering.offering?.displayName,
      offeringFullLabel,
      status: offering.status,
      attemptsUsed: offering.attemptsUsed,
      attemptsRemaining: Math.max(0, PT_MAX_ATTEMPTS - offering.attemptsUsed),
      lastScore: offering.lastScore,
      lastMaxScore: offering.lastMaxScore,
      lastAttemptAt: offering.lastAttemptAt,
      passedAt: offering.passedAt,
      lastTimeTakenSeconds: offering.lastTimeTakenSeconds,
      createdDate: offering.createdDate,
      rateCard: this.tutorRateCardService.mapToGraphql(rateCardEntity),
    };
  }

  private mapScreeningDetail(
    screening: DocumentScreeningEntity,
  ): AdminTutorDocumentScreeningDetail {
    return {
      status: screening.status,
      summaryNotes: screening.summaryNotes,
      confidence: screening.confidence,
      automatedAt: screening.automatedAt,
      reviewerNote: screening.reviewerNote,
      reviewedAt: screening.reviewedAt,
    };
  }
}
