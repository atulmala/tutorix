import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADD_MY_TUTOR_OFFERING,
  GET_MY_TUTOR_DETAIL,
  GET_OFFERINGS,
} from '@tutorix/shared-graphql';
import { OfferingCascadePicker } from '@tutorix/tutor-detail-ui';
import { TutorPT } from '../tutor-onboarding/tutor-pt/TutorPT';

type PtFeeInfo = {
  listPriceInr: number;
  amountDueInr: number;
  displayLabel: string;
};

type AddOfferingFlowProps = {
  excludeOfferingIds: number[];
  testTutor?: boolean;
  onClose: () => void;
  onComplete: () => void;
};

type Step = 'select' | 'confirm' | 'pt';

export const AddOfferingFlow: React.FC<AddOfferingFlowProps> = ({
  excludeOfferingIds,
  testTutor,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<Step>('select');
  const [leafOfferingId, setLeafOfferingId] = useState<number | null>(null);
  const [addResult, setAddResult] = useState<{
    tutorOfferingId: number;
    ptFee: PtFeeInfo;
    offeringName?: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_OFFERINGS, {
    fetchPolicy: 'cache-first',
  });

  const [addOffering, { loading: adding }] = useMutation(ADD_MY_TUTOR_OFFERING, {
    refetchQueries: [{ query: GET_MY_TUTOR_DETAIL }],
  });

  const offerings = useMemo(() => data?.offerings ?? [], [data?.offerings]);

  const handleLeafSelected = (id: number) => {
    setLeafOfferingId(id);
    setSubmitError(null);
    setStep('confirm');
  };

  const handleConfirmAdd = async () => {
    if (!leafOfferingId) return;
    setSubmitError(null);
    try {
      const result = await addOffering({
        variables: { offeringId: leafOfferingId },
      });
      const payload = result.data?.addMyTutorOffering;
      if (!payload) return;
      setAddResult({
        tutorOfferingId: payload.tutorOffering.id,
        ptFee: payload.ptFee,
        offeringName: payload.tutorOffering.offering?.displayName,
      });
      setStep('pt');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Could not add offering.',
      );
    }
  };

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-purple-200 bg-white p-6 shadow-lg">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-primary">Add offering</h1>
          <p className="mt-1 text-sm text-muted">
            Select a new subject to teach, then pass the proficiency test.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-semibold text-muted hover:text-primary"
        >
          Close
        </button>
      </div>

      {step === 'select' ? (
        <OfferingCascadePicker
          offerings={offerings}
          excludeOfferingIds={excludeOfferingIds}
          introText="Select study area, board, class, and subject for the new offering."
          submitLabel="Next"
          loading={loading}
          error={error ? 'Failed to load offerings.' : null}
          onSubmit={handleLeafSelected}
        />
      ) : null}

      {step === 'confirm' && leafOfferingId ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Proficiency test fee</p>
            <p className="mt-1 text-sm text-amber-900">
              List price: <span className="font-bold">₹99</span>
            </p>
            <p className="mt-1 text-sm font-medium text-amber-900">
              Free for now — no payment required.
            </p>
            <p className="mt-2 text-xs text-amber-800/90">
              You get up to 2 attempts to pass the test for this offering.
            </p>
          </div>
          {submitError ? <p className="text-sm text-danger">{submitError}</p> : null}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep('select')}
              className="h-11 rounded-lg border border-subtle px-4 text-sm font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmAdd}
              disabled={adding}
              className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Continue to proficiency test'}
            </button>
          </div>
        </div>
      ) : null}

      {step === 'pt' && addResult ? (
        <TutorPT
          context="addOffering"
          tutorOfferingId={addResult.tutorOfferingId}
          offeringDisplayName={addResult.offeringName}
          ptFeeDisplayLabel={addResult.ptFee.displayLabel}
          testTutor={testTutor}
          onComplete={() => {
            onComplete();
            onClose();
          }}
        />
      ) : null}
    </div>
  );
};
