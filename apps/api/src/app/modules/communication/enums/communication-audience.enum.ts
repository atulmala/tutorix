import { registerEnumType } from '@nestjs/graphql';

export enum CommunicationAudience {
  ACTOR = 'ACTOR',
  STUDENT = 'STUDENT',
  TUTOR = 'TUTOR',
}

registerEnumType(CommunicationAudience, {
  name: 'CommunicationAudience',
  description: 'Who receives a message for a communication event',
});
