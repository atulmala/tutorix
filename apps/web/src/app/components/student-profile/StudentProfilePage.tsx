import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CREATE_STUDENT_ADDRESS,
  GET_CURRENT_USER,
  GET_MY_STUDENT_DETAIL,
  SAVE_STUDENT_EDUCATION,
  SAVE_STUDENT_PARENT_STEP,
} from '@tutorix/shared-graphql';
import {
  StudentDetailView,
  type EducationFormValues,
  type ParentFormValues,
  type StudentDetailRecord,
} from '@tutorix/student-detail-ui';
import type { AddressFormValues, AddressLocationSuggestion } from '@tutorix/tutor-detail-ui';
import { useGooglePlacesAutocomplete } from '../../../hooks/useGooglePlacesAutocomplete';
import { useWebAuth } from '../../auth/useWebAuth';
import { HeaderProfileAvatar } from '../HeaderProfileAvatar';
import type { WebUser } from '../../types/web-user';

type MyStudentDetailData = {
  myStudentDetail: StudentDetailRecord;
};

type CurrentUserData = {
  me: WebUser;
};

export const StudentProfilePage: React.FC = () => {
  const { user: currentUser, refreshUser } = useWebAuth();
  const { data: meData, loading: meLoading } = useQuery<CurrentUserData>(GET_CURRENT_USER, {
    fetchPolicy: 'network-only',
    skip: !currentUser,
  });
  const avatarUser = meData?.me ?? currentUser;
  const { data, loading, error, refetch } = useQuery<MyStudentDetailData>(GET_MY_STUDENT_DETAIL, {
    fetchPolicy: 'cache-and-network',
  });

  const [parentSaveError, setParentSaveError] = useState<string | null>(null);
  const [addressSaveError, setAddressSaveError] = useState<string | null>(null);
  const [educationSaveError, setEducationSaveError] = useState<string | null>(null);

  const [saveParent, { loading: savingParent }] = useMutation(SAVE_STUDENT_PARENT_STEP);
  const [saveAddress, { loading: savingAddress }] = useMutation(CREATE_STUDENT_ADDRESS);
  const [saveEducation, { loading: savingEducation }] = useMutation(SAVE_STUDENT_EDUCATION);

  const places = useGooglePlacesAutocomplete();
  const {
    ready: placesReady,
    error: placesError,
    getPredictions,
    getPlaceDetails,
  } = places;

  const student = data?.myStudentDetail;

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
      getPlaceDetails: async (placeId: string) =>
        mapPlaceToLocation(await getPlaceDetails(placeId)),
    }),
    [getPlaceDetails, getPredictions, mapPlaceToLocation, placesError, placesReady],
  );

  const handleSaveParent = async (values: ParentFormValues) => {
    setParentSaveError(null);
    try {
      await saveParent({
        variables: {
          input: {
            parentRelation: values.parentRelation,
            parentName: values.parentName,
          },
        },
      });
      await refetch();
    } catch (err) {
      setParentSaveError(
        err instanceof Error ? err.message : 'Could not save parent details.',
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

  const handleSaveEducation = async (values: EducationFormValues) => {
    setEducationSaveError(null);
    try {
      await saveEducation({
        variables: {
          input: {
            studentType: values.studentType,
            schoolClass: values.schoolClass,
            board: values.board,
            boardOther: values.boardOther,
          },
        },
      });
      await refetch();
    } catch (err) {
      setEducationSaveError(
        err instanceof Error ? err.message : 'Could not save education details.',
      );
      throw err;
    }
  };

  const handleProfilePictureUpload = useCallback(async () => {
    await refreshUser();
    await refetch();
  }, [refreshUser, refetch]);

  if (loading && !student) {
    return (
      <div className="w-full max-w-5xl rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-8 text-center">
        <p className="text-sm font-medium text-sky-800">Loading your profile…</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="w-full max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-700">Could not load your student profile.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      <p className="mb-4 text-sm text-muted">Your student profile</p>
      <StudentDetailView
        mode="student"
        student={student}
        profileAvatar={
          avatarUser ? (
            <HeaderProfileAvatar
              user={avatarUser}
              userLoading={meLoading && !meData?.me}
              onUploadComplete={handleProfilePictureUpload}
              size="xl"
              errorAlign="left"
              emptyHint="students with profile pic are easier for tutors to recognize!"
            />
          ) : null
        }
        onSaveParent={handleSaveParent}
        savingParent={savingParent}
        parentSaveError={parentSaveError}
        onSaveAddress={handleSaveAddress}
        savingAddress={savingAddress}
        addressSaveError={addressSaveError}
        addressAutocomplete={addressAutocomplete}
        onSaveEducation={handleSaveEducation}
        savingEducation={savingEducation}
        educationSaveError={educationSaveError}
      />
    </div>
  );
};
