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

export const ADMIN_UPDATE_COMMUNICATION_RULE = gql`
  mutation AdminUpdateCommunicationRule(
    $input: AdminUpdateCommunicationRuleInput!
  ) {
    adminUpdateCommunicationRule(input: $input) {
      ${COMMUNICATION_CATALOG_FIELDS}
    }
  }
`;

export const ADMIN_UPDATE_COMMUNICATION_TEMPLATE = gql`
  mutation AdminUpdateCommunicationTemplate(
    $input: AdminUpdateCommunicationTemplateInput!
  ) {
    adminUpdateCommunicationTemplate(input: $input) {
      ${COMMUNICATION_CATALOG_FIELDS}
    }
  }
`;

export const REGISTER_DEVICE_TOKEN = gql`
  mutation RegisterDeviceToken($input: RegisterDeviceTokenInput!) {
    registerDeviceToken(input: $input)
  }
`;

export const UNREGISTER_DEVICE_TOKEN = gql`
  mutation UnregisterDeviceToken($input: UnregisterDeviceTokenInput!) {
    unregisterDeviceToken(input: $input)
  }
`;
