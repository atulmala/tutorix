import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { GET_MY_TUTOR_DETAIL, SAVE_MY_BANK_DETAILS } from '@tutorix/shared-graphql';
import {
  TutorDetailView,
  type BankDetailsFormValues,
  type TutorDetailRecord,
} from '@tutorix/tutor-detail-ui';

type MyTutorDetailData = {
  myTutorDetail: TutorDetailRecord;
};

export const TutorProfilePage: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<MyTutorDetailData>(GET_MY_TUTOR_DETAIL, {
    fetchPolicy: 'cache-and-network',
  });
  const [bankDetailsSaveError, setBankDetailsSaveError] = useState<string | null>(null);

  const [saveBankDetails, { loading: savingBankDetails }] = useMutation(SAVE_MY_BANK_DETAILS);

  const tutor = data?.myTutorDetail;

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

  return (
    <div className="w-full max-w-5xl">
      <p className="mb-4 text-sm text-muted">Your tutor profile</p>
      <TutorDetailView
        mode="tutor"
        tutor={tutor}
        onSaveBankDetails={handleSaveBankDetails}
        savingBankDetails={savingBankDetails}
        bankDetailsSaveError={bankDetailsSaveError}
      />
    </div>
  );
};
