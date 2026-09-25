import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation } from '@apollo/client';
import { MY_CLASS_CREDITS } from '@tutorix/shared-graphql/queries';
import {
  RESCHEDULE_CLASS_CREDIT,
  SCHEDULE_CLASS_CREDIT,
} from '@tutorix/shared-graphql/mutations';
import { StudentTutorBookingScreen } from '../student-tutor-booking/StudentTutorBookingScreen';
import type { StudentClassCredit } from './StudentClassCreditsScreen';

type StudentClassScheduleScreenProps = {
  credit: StudentClassCredit;
  onScheduled: () => void;
};

export const StudentClassScheduleScreen: React.FC<StudentClassScheduleScreenProps> = ({
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
    <View style={{ flex: 1 }}>
      {errorMessage ? (
        <Text style={{ paddingHorizontal: 20, paddingTop: 8, color: '#dc2626' }}>
          {errorMessage}
        </Text>
      ) : null}
      <StudentTutorBookingScreen
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
    </View>
  );
};
