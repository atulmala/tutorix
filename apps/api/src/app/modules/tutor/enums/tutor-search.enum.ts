import { registerEnumType } from '@nestjs/graphql';

export enum TutorSearchDeliveryMode {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ANY = 'ANY',
}

export enum TutorSearchClassFormat {
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP = 'GROUP',
  ANY = 'ANY',
}

export enum TutorSearchSort {
  BEST_MATCH = 'BEST_MATCH',
  DISTANCE = 'DISTANCE',
  RATE = 'RATE',
}

registerEnumType(TutorSearchDeliveryMode, { name: 'TutorSearchDeliveryMode' });
registerEnumType(TutorSearchClassFormat, { name: 'TutorSearchClassFormat' });
registerEnumType(TutorSearchSort, { name: 'TutorSearchSort' });
