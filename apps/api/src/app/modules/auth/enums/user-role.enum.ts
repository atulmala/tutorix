import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  TUTOR = 'TUTOR',
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User roles in the system',
});

