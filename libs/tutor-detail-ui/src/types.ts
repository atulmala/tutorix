export type TutorDocumentDetail = {
  id: number;
  name?: string | null;
  documentType?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  previewUrl?: string | null;
  viewUrl?: string | null;
  createdDate?: string | null;
  screening?: {
    status?: string | null;
    summaryNotes?: string | null;
    confidence?: number | null;
    automatedAt?: string | null;
    reviewerNote?: string | null;
    reviewedAt?: string | null;
  } | null;
};

export type TutorDetailRecord = {
  id: number;
  certificationStage?: string | null;
  yearsOfExperience: string;
  regFeePaid: boolean;
  testTutor: boolean;
  canSetAvailability?: boolean;
  availabilityConfiguredAt?: string | null;
  regFeeAmount?: number | null;
  regFeeAmountToBePaid?: number | null;
  regFeeDate?: string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    mobile?: string | null;
    mobileCountryCode?: string | null;
    mobileNumber?: string | null;
    createdDate?: string | null;
    bankDetails?: {
      bankName?: string | null;
      ifscCode?: string | null;
      accountNumberMasked?: string | null;
      accountNumber?: string | null;
      gstNumber?: string | null;
      panNumber?: string | null;
      isComplete?: boolean;
    } | null;
  } | null;
  addresses: Array<{
    id: number;
    type?: string | null;
    street?: string | null;
    subArea?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: number | null;
    fullAddress?: string | null;
    createdDate?: string | null;
    updatedDate?: string | null;
  }>;
  qualifications: Array<{
    id: number;
    qualificationType: string;
    boardOrUniversity: string;
    degreeName?: string | null;
    gradeType: string;
    gradeValue: string;
    yearObtained: number;
    fieldOfStudy?: string | null;
    createdDate?: string | null;
    updatedDate?: string | null;
  }>;
  experiences: Array<{
    id: number;
    jobTitle: string;
    employerName?: string | null;
    employerAddress?: string | null;
    employmentType: number;
    startDate: string;
    endDate?: string | null;
    isCurrent: boolean;
    createdDate?: string | null;
    updatedDate?: string | null;
  }>;
  offerings: Array<{
    id: number;
    offeringId: number;
    offeringName?: string | null;
    offeringDisplayName?: string | null;
    offeringFullLabel?: string | null;
    status: string;
    attemptsUsed: number;
    attemptsRemaining: number;
    lastScore?: number | null;
    lastMaxScore?: number | null;
    lastAttemptAt?: string | null;
    passedAt?: string | null;
    lastTimeTakenSeconds?: number | null;
    createdDate?: string | null;
    rateCard?: {
      freeDemoOffered: boolean;
      offlineEnabled: boolean;
      offlineBaseRate?: number | null;
      offlineBaseDiscountPct?: number | null;
      offlineSlab2DiscountPct?: number | null;
      offlineSlab3DiscountPct?: number | null;
      onlineEnabled: boolean;
      onlineBaseRate?: number | null;
      onlineBaseDiscountPct?: number | null;
      onlineSlab2DiscountPct?: number | null;
      onlineSlab3DiscountPct?: number | null;
      offlineBatchSize?: number | null;
      onlineBatchSize?: number | null;
      isComplete: boolean;
    } | null;
  }>;
  documents: TutorDocumentDetail[];
};
