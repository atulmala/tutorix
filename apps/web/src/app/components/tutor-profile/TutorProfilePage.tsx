import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CREATE_TUTOR_ADDRESS,
  GET_CURRENT_USER,
  GET_MY_TUTOR_DETAIL,
  SAVE_MY_BANK_DETAILS,
  SAVE_MY_TUTOR_OFFERING_RATE_CARD,
  SAVE_TUTOR_EXPERIENCES,
  SAVE_TUTOR_QUALIFICATIONS,
} from '@tutorix/shared-graphql';
import {
  buildExperienceMutationInput,
  buildQualificationMutationInput,
  normalizeYearsOfExperience,
  type ExperienceFormRow,
  type QualificationFormRow,
} from '@tutorix/shared-utils';
import {
  TutorDetailView,
  type AddressFormValues,
  type AddressLocationSuggestion,
  type BankDetailsFormValues,
  type RateCardFormValues,
  type TutorDetailRecord,
} from '@tutorix/tutor-detail-ui';
import { AddOfferingFlow } from './AddOfferingFlow';
import { TutorPT } from '../tutor-onboarding/tutor-pt/TutorPT';
import { useGooglePlacesAutocomplete } from '../../../hooks/useGooglePlacesAutocomplete';
import { useWebAuth } from '../../auth/useWebAuth';
import { HeaderProfileAvatar } from '../HeaderProfileAvatar';
import type { WebUser } from '../../types/web-user';

type MyTutorDetailData = {
  myTutorDetail: TutorDetailRecord;
};

type CurrentUserData = {
  me: WebUser;
};

export const TutorProfilePage: React.FC = () => {
  const { user: currentUser, refreshUser } = useWebAuth();
  const { data: meData, loading: meLoading } = useQuery<CurrentUserData>(GET_CURRENT_USER, {
    fetchPolicy: 'network-only',
    skip: !currentUser,
  });
  const avatarUser = meData?.me ?? currentUser;
  const { data, loading, error, refetch } = useQuery<MyTutorDetailData>(GET_MY_TUTOR_DETAIL, {
    fetchPolicy: 'cache-and-network',
  });
  const [bankDetailsSaveError, setBankDetailsSaveError] = useState<string | null>(null);
  const [addressSaveError, setAddressSaveError] = useState<string | null>(null);
  const [rateCardSaveError, setRateCardSaveError] = useState<string | null>(null);
  const [experienceSaveError, setExperienceSaveError] = useState<string | null>(null);
  const [qualificationSaveError, setQualificationSaveError] = useState<string | null>(null);
  const [showAddOffering, setShowAddOffering] = useState(false);
  const [ptOffering, setPtOffering] = useState<
    TutorDetailRecord['offerings'][number] | null
  >(null);

  const [saveAddress, { loading: savingAddress }] = useMutation(CREATE_TUTOR_ADDRESS);
  const [saveBankDetails, { loading: savingBankDetails }] = useMutation(SAVE_MY_BANK_DETAILS);
  const [saveRateCard, { loading: savingRateCard }] = useMutation(SAVE_MY_TUTOR_OFFERING_RATE_CARD);
  const [saveExperiences, { loading: savingExperiences }] = useMutation(SAVE_TUTOR_EXPERIENCES);
  const [saveQualifications, { loading: savingQualifications }] = useMutation(
    SAVE_TUTOR_QUALIFICATIONS,
  );
  const places = useGooglePlacesAutocomplete();
  const {
    ready: placesReady,
    error: placesError,
    getPredictions,
    getPlaceDetails,
  } = places;

  const tutor = data?.myTutorDetail;

  const excludeOfferingIds = useMemo(
    () =>
      (tutor?.offerings ?? [])
        .map((o) => o.offeringId)
        .filter((id): id is number => id != null),
    [tutor?.offerings],
  );

  const mapPlaceToLocation = useCallback((place: unknown): AddressLocationSuggestion => {
    const p = place as {
      formatted_address?: string;
      geometry?: { location?: { lat: () => number; lng: () => number } };
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
    };

    const components = p.address_components ?? [];
    const getComponent = (type: string, useShort = false): string | undefined => {
      const comp = components.find((c) => c.types.includes(type));
      return comp ? (useShort ? comp.short_name : comp.long_name) : undefined;
    };

    const city =
      getComponent('locality') ||
      getComponent('administrative_area_level_2') ||
      getComponent('sublocality') ||
      getComponent('postal_town');
    const state = getComponent('administrative_area_level_1');
    const country = getComponent('country');
    const postalCode =
      getComponent('postal_code') ||
      getComponent('postal_code', true) ||
      getComponent('postal_code_prefix') ||
      getComponent('postal_code_prefix', true);
    const location = p.geometry?.location;

    return {
      displayName: p.formatted_address ?? '',
      latitude: location ? location.lat() : 0,
      longitude: location ? location.lng() : 0,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      postalCode: postalCode || undefined,
    };
  }, []);

  const addressAutocomplete = useMemo(
    () => ({
      ready: placesReady,
      error: placesError,
      getPredictions,
      getPlaceDetails: async (placeId: string) => mapPlaceToLocation(await getPlaceDetails(placeId)),
    }),
    [getPlaceDetails, getPredictions, mapPlaceToLocation, placesError, placesReady],
  );

  const handleSaveBankDetails = async (values: BankDetailsFormValues) => {
    setBankDetailsSaveError(null);
    try {
      await saveBankDetails({
        variables: {
          input: {
            bankName: values.bankName,
            accountNumber: values.accountNumber,
            ifscCode: values.ifscCode,
            panNumber: values.panNumber,
            gstNumber: values.gstNumber.trim() || null,
          },
        },
      });
      await refetch();
    } catch (err) {
      setBankDetailsSaveError(
        err instanceof Error ? err.message : 'Could not save bank details.',
      );
      throw err;
    }
  };

  const handleSaveAddress = async (values: AddressFormValues) => {
    setAddressSaveError(null);
    const fullAddress = [
      values.street,
      values.subArea,
      values.city,
      values.state,
      values.postalCode,
      values.country,
    ]
      .filter(Boolean)
      .join(', ');

    try {
      await saveAddress({
        variables: {
          input: {
            type: 'HOME',
            street: values.street,
            subArea: values.subArea,
            city: values.city,
            state: values.state,
            country: values.country,
            postalCode: Number.parseInt(values.postalCode, 10),
            fullAddress,
            latitude: values.latitude,
            longitude: values.longitude,
          },
        },
      });
      await refetch();
    } catch (err) {
      setAddressSaveError(err instanceof Error ? err.message : 'Could not save address.');
      throw err;
    }
  };

  const handleSaveRateCard = async (tutorOfferingId: number, values: RateCardFormValues) => {
    setRateCardSaveError(null);
    try {
      await saveRateCard({
        variables: {
          input: {
            tutorOfferingId,
            freeDemoOffered: values.freeDemoOffered,
            offlineEnabled: values.offlineEnabled,
            offlineBaseRate: values.offlineEnabled ? values.offlineBaseRate : null,
            offlineBaseDiscountPct: values.offlineEnabled
              ? values.offlineBaseDiscountPct
              : null,
            offlineSlab2DiscountPct: values.offlineEnabled
              ? values.offlineSlab2DiscountPct
              : null,
            offlineSlab3DiscountPct: values.offlineEnabled
              ? values.offlineSlab3DiscountPct
              : null,
            offlineBatchSize: values.offlineEnabled ? values.offlineBatchSize : null,
            onlineEnabled: values.onlineEnabled,
            onlineBaseRate: values.onlineEnabled ? values.onlineBaseRate : null,
            onlineBaseDiscountPct: values.onlineEnabled
              ? values.onlineBaseDiscountPct
              : null,
            onlineSlab2DiscountPct: values.onlineEnabled ? values.onlineSlab2DiscountPct : null,
            onlineSlab3DiscountPct: values.onlineEnabled ? values.onlineSlab3DiscountPct : null,
            onlineBatchSize: values.onlineEnabled ? values.onlineBatchSize : null,
          },
        },
      });
      await refetch();
    } catch (err) {
      setRateCardSaveError(err instanceof Error ? err.message : 'Could not save rate card.');
      throw err;
    }
  };

  const handleSaveExperiences = async (rows: ExperienceFormRow[]) => {
    if (!tutor) return;
    setExperienceSaveError(null);
    try {
      await saveExperiences({
        variables: {
          input: {
            experiences: buildExperienceMutationInput(rows),
            yearsOfExperience: normalizeYearsOfExperience(tutor.yearsOfExperience),
            advanceToNextStep: false,
          },
        },
      });
      await refetch();
    } catch (err) {
      setExperienceSaveError(
        err instanceof Error ? err.message : 'Could not save experience.',
      );
      throw err;
    }
  };

  const handleSaveQualifications = async (rows: QualificationFormRow[]) => {
    setQualificationSaveError(null);
    try {
      await saveQualifications({
        variables: {
          input: {
            qualifications: buildQualificationMutationInput(rows),
            advanceToNextStep: false,
          },
        },
      });
      await refetch();
    } catch (err) {
      setQualificationSaveError(
        err instanceof Error ? err.message : 'Could not save qualifications.',
      );
      throw err;
    }
  };

  const handleProfilePictureUpload = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  if (loading && !tutor) {
    return (
      <div className="w-full max-w-5xl rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-8 text-center">
        <p className="text-sm font-medium text-sky-800">Loading your profile…</p>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="w-full max-w-4xl rounded-2xl border border-subtle bg-white p-8 shadow-lg">
        <p className="text-sm text-red-600" role="alert">
          Could not load your tutor profile.
        </p>
      </div>
    );
  }

  if (ptOffering) {
    const offeringLabel =
      ptOffering.offeringFullLabel ??
      ptOffering.offeringDisplayName ??
      ptOffering.offeringName ??
      'this offering';
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-purple-200 bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold text-primary">Proficiency test</h1>
        <p className="mt-1 text-sm text-muted">{offeringLabel}</p>
        <div className="mt-6">
          <TutorPT
            context="profile"
            tutorOfferingId={ptOffering.id}
            offeringDisplayName={offeringLabel}
            attemptsUsed={ptOffering.attemptsUsed}
            testTutor={tutor.testTutor}
            onComplete={async () => {
              setPtOffering(null);
              await refetch();
            }}
          />
        </div>
      </div>
    );
  }

  if (showAddOffering) {
    return (
      <div className="w-full max-w-5xl">
        <AddOfferingFlow
          excludeOfferingIds={excludeOfferingIds}
          testTutor={tutor.testTutor}
          onClose={() => setShowAddOffering(false)}
          onComplete={async () => {
            setShowAddOffering(false);
            await refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      <p className="mb-4 text-sm text-muted">Your tutor profile</p>
      <TutorDetailView
        mode="tutor"
        tutor={tutor}
        profileAvatar={
          avatarUser ? (
            <HeaderProfileAvatar
              user={avatarUser}
              userLoading={meLoading && !meData?.me}
              onUploadComplete={handleProfilePictureUpload}
              size="xl"
              errorAlign="left"
              emptyHint="tutors with Profile pic have higher chances of classes bookings!"
            />
          ) : null
        }
        onAddOffering={() => setShowAddOffering(true)}
        onStartProficiencyTest={(offering) => setPtOffering(offering)}
        onSaveBankDetails={handleSaveBankDetails}
        savingBankDetails={savingBankDetails}
        bankDetailsSaveError={bankDetailsSaveError}
        onSaveAddress={handleSaveAddress}
        savingAddress={savingAddress}
        addressSaveError={addressSaveError}
        addressAutocomplete={addressAutocomplete}
        onSaveRateCard={handleSaveRateCard}
        savingRateCard={savingRateCard}
        rateCardSaveError={rateCardSaveError}
        onSaveExperiences={handleSaveExperiences}
        savingExperiences={savingExperiences}
        experienceSaveError={experienceSaveError}
        onSaveQualifications={handleSaveQualifications}
        savingQualifications={savingQualifications}
        qualificationSaveError={qualificationSaveError}
      />
    </div>
  );
};
