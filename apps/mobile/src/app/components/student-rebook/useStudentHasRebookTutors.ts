import { useQuery } from '@apollo/client';
import { STUDENT_REBOOK_TUTORS } from '@tutorix/shared-graphql/queries';

export function useStudentHasRebookTutors(): boolean {
  const { data } = useQuery(STUDENT_REBOOK_TUTORS, {
    fetchPolicy: 'cache-first',
  });
  const tutors = data?.studentRebookTutors;
  return Array.isArray(tutors) && tutors.length > 0;
}
