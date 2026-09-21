import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  GET_MY_TUTOR_DETAIL,
  GET_MY_TUTOR_PROFILE,
  SAVE_MY_BANK_DETAILS,
} from '@tutorix/shared-graphql';
import {
  BANK_ACCOUNT_SETUP_HEADING,
  BANK_ACCOUNT_SETUP_REQUIRED_MESSAGE,
} from '@tutorix/shared-utils';
import {
  BankDetailsModal,
  type BankDetailsFormValues,
} from '@tutorix/tutor-detail-ui';

type MyTutorDetailData = {
  myTutorDetail?: {
    user?: {
      bankDetails?: {
        bankName?: string | null;
        ifscCode?: string | null;
        panNumber?: string | null;
        gstNumber?: string | null;
      } | null;
    } | null;
  } | null;
};

type TutorBankSetupPageProps = {
  onComplete: () => void;
};

export const TutorBankSetupPage: React.FC<TutorBankSetupPageProps> = ({
  onComplete,
}) => {
  const { data } = useQuery<MyTutorDetailData>(GET_MY_TUTOR_DETAIL, {
    fetchPolicy: 'cache-and-network',
  });
  const [saveBankDetails, { loading }] = useMutation(SAVE_MY_BANK_DETAILS, {
    refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
    awaitRefetchQueries: true,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: BankDetailsFormValues) => {
    setError(null);
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
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save bank details.');
    }
  };

  return (
    <BankDetailsModal
      open
      required
      heading={BANK_ACCOUNT_SETUP_HEADING}
      description={BANK_ACCOUNT_SETUP_REQUIRED_MESSAGE}
      initialValues={data?.myTutorDetail?.user?.bankDetails}
      saving={loading}
      error={error}
      onSubmit={(values) => {
        void handleSubmit(values);
      }}
    />
  );
};
