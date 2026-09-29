export type GroupableClassCredit = {
  id: number;
  tutorId: number;
  offeringId: number;
  tutorOfferingId: number;
  tutorName: string;
  offeringLabel: string;
  deliveryMode: string;
};

export type UnscheduledClassCreditGroup<T extends GroupableClassCredit> = {
  key: string;
  credits: T[];
};

/** One card per tutor, subject, and online/offline mode. */
export function groupUnscheduledClassCredits<T extends GroupableClassCredit>(
  credits: T[],
): UnscheduledClassCreditGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const credit of credits) {
    const key = `${credit.tutorOfferingId}:${credit.offeringId}:${credit.deliveryMode}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(credit);
    } else {
      groups.set(key, [credit]);
    }
  }
  return [...groups.entries()].map(([key, rows]) => ({ key, credits: rows }));
}
