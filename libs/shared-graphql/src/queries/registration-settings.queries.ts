import { gql } from '@apollo/client';

export const GET_REGISTRATION_SETTINGS = gql`
  query RegistrationSettings {
    registrationSettings {
      tutorRegistrationEnabled
      studentRegistrationEnabled
      disabledMessage
    }
  }
`;

export const GET_ADMIN_REGISTRATION_SETTINGS = gql`
  query AdminRegistrationSettings {
    adminRegistrationSettings {
      tutorRegistrationEnabled
      studentRegistrationEnabled
      disabledMessage
    }
  }
`;
