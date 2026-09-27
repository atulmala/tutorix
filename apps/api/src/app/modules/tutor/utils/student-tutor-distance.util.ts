import { hasUsableCoordinates, haversineKm } from '@tutorix/shared-utils';
import { AddressType } from '../../address/enums/address-type.enum';
import { AddressEntity } from '../../address/entities/address.entity';

export function pickStudentOrigin(
  addresses: AddressEntity[],
): AddressEntity | null {
  const usable = addresses.filter(
    (a) => !a.deleted && hasUsableCoordinates(a.latitude, a.longitude),
  );
  return usable.find((a) => a.primary) ?? usable[0] ?? null;
}

export function pickTutorTeachingPoint(
  addresses: AddressEntity[],
): AddressEntity | null {
  const usable = addresses.filter(
    (a) => !a.deleted && hasUsableCoordinates(a.latitude, a.longitude),
  );
  return (
    usable.find((a) => a.type === AddressType.TEACHING) ??
    usable.find((a) => a.type === AddressType.HOME) ??
    usable.find((a) => a.primary) ??
    usable[0] ??
    null
  );
}

export function distanceKmBetweenStudentAndTutor(
  studentAddresses: AddressEntity[],
  tutorAddresses: AddressEntity[],
): number | null {
  const origin = pickStudentOrigin(studentAddresses);
  const tutorPoint = pickTutorTeachingPoint(tutorAddresses);
  if (!origin || !tutorPoint) {
    return null;
  }
  if (
    !hasUsableCoordinates(origin.latitude, origin.longitude) ||
    !hasUsableCoordinates(tutorPoint.latitude, tutorPoint.longitude)
  ) {
    return null;
  }
  return haversineKm(
    Number(origin.latitude),
    Number(origin.longitude),
    Number(tutorPoint.latitude),
    Number(tutorPoint.longitude),
  );
}
