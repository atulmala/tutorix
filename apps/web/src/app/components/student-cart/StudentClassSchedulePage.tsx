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
  credit: StudentClassCredit;
  onScheduled: () => void;
};

export const StudentClassSchedulePage: React.FC<StudentClassSchedulePageProps> = ({
  credit,
  onScheduled,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isReschedule = credit.status === 'scheduled';
  const [scheduleCredit, { loading: scheduling }] = useMutation(SCHEDULE_CLASS_CREDIT, {
    refetchQueries: [{ query: MY_CLASS_CREDITS }],
  });
  const [rescheduleCredit, { loading: rescheduling }] = useMutation(
    RESCHEDULE_CLASS_CREDIT,
    {
      refetchQueries: [{ query: MY_CLASS_CREDITS }],
    },
  );

  return (
    <div className="w-full max-w-xl space-y-3">
      {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
      <StudentTutorBookingPage
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
              onScheduled();
            } catch (error) {
              setErrorMessage(
                error instanceof Error ? error.message : 'Could not save this slot.',
              );
            }
          })();
        }}
      />
    </div>
  );
};
