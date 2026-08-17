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

export const GET_ADMIN_COMMUNICATION_CATALOG = gql`
  query AdminCommunicationCatalog {
    adminCommunicationCatalog {
      ${COMMUNICATION_CATALOG_FIELDS}
    }
  }
`;
