import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  MY_CLASS_CREDITS,
  RESCHEDULE_CLASS_CREDIT,
  SCHEDULE_CLASS_CREDIT,
} from '@tutorix/shared-graphql';
import { StudentTutorBookingPage } from '../student-tutor-booking/StudentTutorBookingPage';
import type { StudentClassCredit } from './StudentClassCreditsPage';

type StudentClassSchedulePageProps = {
  credits: StudentClassCredit[];
  onScheduled: () => void;
  onScheduleLater: () => void;
};

export const StudentClassSchedulePage: React.FC<StudentClassSchedulePageProps> = ({
  credits,
  onScheduled,
  onScheduleLater,
}) => {
  const [index, setIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const credit = credits[Math.min(index, credits.length - 1)];
  const remaining = credits.length - index;
  const isReschedule = credit?.status === 'scheduled';
  const [scheduleCredit, { loading: scheduling }] = useMutation(SCHEDULE_CLASS_CREDIT, {
    refetchQueries: [{ query: MY_CLASS_CREDITS }],
  });
  const [rescheduleCredit, { loading: rescheduling }] = useMutation(
    RESCHEDULE_CLASS_CREDIT,
    {
      refetchQueries: [{ query: MY_CLASS_CREDITS }],
    },
  );

  if (!credit) {
    return null;
  }

  return (
    <div className="w-full max-w-xl space-y-3">
      {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
      {!isReschedule && credits.length > 1 ? (
        <p className="text-sm font-semibold text-[#143055]">
          {remaining} {remaining === 1 ? 'class' : 'classes'} left to schedule
        </p>
      ) : null}
      <StudentTutorBookingPage
        key={credit.id}
        tutorId={String(credit.tutorId)}
        offeringId={String(credit.offeringId)}
        lockedDeliveryMode={credit.deliveryMode}
        title={isReschedule ? 'Reschedule class' : 'Schedule class'}
        submitLabel={
          scheduling || rescheduling
            ? 'Saving…'
            : isReschedule
              ? 'Save new slot'
              : 'Save slot'
        }
        onContinue={(draft) => {
          void (async () => {
            setErrorMessage(null);
            try {
              const variables = {
                creditId: String(credit.id),
                tutorCalendarId: draft.tutorCalendarId,
              };
              if (isReschedule) {
                await rescheduleCredit({ variables });
              } else {
                await scheduleCredit({ variables });
              }
              if (index + 1 < credits.length) {
                setIndex(index + 1);
              } else {
                onScheduled();
              }
            } catch (error) {
              setErrorMessage(
                error instanceof Error ? error.message : 'Could not save this slot.',
              );
            }
          })();
        }}
      />
      {!isReschedule ? (
        <button
          type="button"
          onClick={onScheduleLater}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-[#143055]"
        >
          I will schedule later
        </button>
      ) : null}
    </div>
  );
};
