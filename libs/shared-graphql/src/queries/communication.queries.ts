import { gql } from '@apollo/client';

const COMMUNICATION_CATALOG_FIELDS = `
  emailConfigured
  pushConfigured
  smsConfigured
  whatsappConfigured
  events {
    event
    audience
    label
    enabled
    mandatory
    emailEnabled
    smsEnabled
    pushEnabled
    whatsappEnabled
    onScreenEnabled
    offsetMinutes
    allowedVariables
    samplePayloadJson
    templates {
      channel
      templatePath
      subject
      title
      text
      body
      dltTemplateId
      dltEntityId
      dltHeader
      whatsappTemplateName
      variableMapping
    }
  }
`;

export const GET_ON_SCREEN_COPY = gql`
  query OnScreenCopy($event: CommunicationEvent!) {
    onScreenCopy(event: $event) {
      enabled
      title
      body
    }
  }
`;

export const GET_MY_IN_APP_MESSAGES = gql`
  query MyInAppMessages($event: CommunicationEvent) {
    myInAppMessages(event: $event) {
      id
      event
      title
      body
      createdDate
      readAt
    }
  }
`;

export const GET_ADMIN_COMMUNICATION_CATALOG = gql`
  query AdminCommunicationCatalog {
    adminCommunicationCatalog {
      ${COMMUNICATION_CATALOG_FIELDS}
    }
  }
`;
