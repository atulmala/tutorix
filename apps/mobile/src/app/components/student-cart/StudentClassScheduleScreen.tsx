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
  credits: StudentClassCredit[];
  onScheduled: () => void;
};

export const StudentClassScheduleScreen: React.FC<StudentClassScheduleScreenProps> = ({
  credits,
  onScheduled,
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
    <View style={{ flex: 1 }}>
      {errorMessage ? (
        <Text style={{ paddingHorizontal: 20, paddingTop: 8, color: '#dc2626' }}>
          {errorMessage}
        </Text>
      ) : null}
      {!isReschedule && credits.length > 1 ? (
        <Text style={{ paddingHorizontal: 20, paddingTop: 8, fontWeight: '700', color: '#143055' }}>
          {remaining} {remaining === 1 ? 'class' : 'classes'} left to schedule
        </Text>
      ) : null}
      <StudentTutorBookingScreen
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
    </View>
  );
};
