export type StudentDetailAddress = {
  id: number;
  street?: string | null;
  subArea?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  fullAddress?: string | null;
  primary?: boolean | null;
  createdDate?: string | null;
  updatedDate?: string | null;
};

export type StudentDetailUser = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobile?: string | null;
  mobileCountryCode?: string | null;
  mobileNumber?: string | null;
  createdDate?: string | null;
  profilePicture?: string | null;
  profilePictureThumbnailMedium?: string | null;
  profilePictureThumbnailLarge?: string | null;
  profilePictureOriginalUrl?: string | null;
};

export type StudentDetailRecord = {
  id: number;
  onboardingStage?: string | null;
  onboardingStageEnteredAt?: string | null;
  onBoardingComplete: boolean;
  parentRelation?: string | null;
  parentName?: string | null;
  studentType?: string | null;
  schoolClass?: number | null;
  board?: string | null;
  boardOther?: string | null;
  user?: StudentDetailUser | null;
  addresses: StudentDetailAddress[];
};
