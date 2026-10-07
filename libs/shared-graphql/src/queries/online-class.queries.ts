import { gql } from '@apollo/client';

export const END_ONLINE_CLASS = gql`
  mutation EndOnlineClass($sessionId: ID!) {
    endOnlineClass(sessionId: $sessionId)
  }
`;

export const ONLINE_CLASS_USAGE = gql`
  query OnlineClassUsage($sessionId: ID!) {
    onlineClassUsage(sessionId: $sessionId) {
      sessionId
      closedSeconds
      closedMinutes
      participants {
        userId
        name
        role
        closedSeconds
        provisionalSeconds
        closedMinutes
        provisionalMinutes
        joinCount
      }
    }
  }
`;

export const JOIN_ONLINE_CLASS = gql`
  mutation JoinOnlineClass($sessionId: ID!) {
    joinOnlineClass(sessionId: $sessionId) {
      appId
      channelName
      token
      rtmToken
      uid
      expiresAt
      warnAt
      scheduledEnd
      whiteboardAppIdentifier
      whiteboardRegion
      whiteboardRoomUuid
      whiteboardRoomToken
      whiteboardError
    }
  }
`;
