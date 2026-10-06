import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { OnlineClassScreen } from './OnlineClassScreen';

const mockJoin = jest.fn();
const mockEnd = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  JOIN_ONLINE_CLASS: { kind: 'join' },
  END_ONLINE_CLASS: { kind: 'end' },
}));

jest.mock('@apollo/client', () => ({
  gql: (literals: TemplateStringsArray) => literals.join(''),
  useMutation: (document: { kind?: string }) =>
    document?.kind === 'end' ? [mockEnd, { loading: false }] : [mockJoin, { loading: false }],
}));

jest.mock('react-native-agora', () => ({
  ChannelProfileType: { ChannelProfileCommunication: 0 },
  ClientRoleType: { ClientRoleBroadcaster: 1 },
  ConnectionChangedReasonType: { ConnectionChangedBannedByServer: 3 },
  createAgoraRtcEngine: () => ({
    initialize: jest.fn(),
    enableVideo: jest.fn(),
    enableAudio: jest.fn(),
    startPreview: jest.fn(),
    addListener: jest.fn(),
    joinChannel: jest.fn(),
    leaveChannel: jest.fn(),
    release: jest.fn(),
    muteLocalAudioStream: jest.fn(),
    muteLocalVideoStream: jest.fn(),
    startScreenCapture: jest.fn(),
    stopScreenCapture: jest.fn(),
  }),
  RtcSurfaceView: () => null,
}));

jest.mock('agora-react-native-rtm', () => ({
  RtmConfig: class RtmConfig {
    appId?: string;
    userId?: string;
  },
  createAgoraRtmClient: () => ({
    addEventListener: jest.fn(),
    login: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@netless/react-native-fastboard', () => ({
  FastRoom: () => null,
}));

describe('OnlineClassScreen', () => {
  beforeEach(() => {
    mockJoin.mockReset();
    mockEnd.mockReset();
    mockEnd.mockResolvedValue({ data: { endOnlineClass: true } });
    mockJoin.mockResolvedValue({
      data: {
        joinOnlineClass: {
          appId: 'app',
          channelName: 'class-9',
          token: 'rtc',
          rtmToken: 'rtm',
          uid: 8,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          warnAt: new Date(Date.now() - 1000).toISOString(),
          whiteboardAppIdentifier: null,
          whiteboardRegion: 'us-sv',
          whiteboardRoomUuid: null,
          whiteboardRoomToken: null,
          whiteboardError: null,
        },
      },
    });
  });

  it('shows the wrap-up warning and leaves', async () => {
    const onLeave = jest.fn();
    render(<OnlineClassScreen sessionId="9" displayName="Student" onLeave={onLeave} />);
    expect(await screen.findByLabelText('Wrap up')).toBeTruthy();
    expect(screen.queryByLabelText('End class')).toBeNull();
    fireEvent.press(screen.getByLabelText('Leave'));
    await waitFor(() => {
      expect(onLeave).toHaveBeenCalled();
    });
  });

  it('lets the tutor end the class', async () => {
    render(
      <OnlineClassScreen sessionId="9" displayName="Tutor" canEndClass onLeave={jest.fn()} />,
    );
    fireEvent.press(await screen.findByLabelText('End class'));
    expect(await screen.findByText('This class has ended')).toBeTruthy();
    expect(mockEnd).toHaveBeenCalledWith({ variables: { sessionId: '9' } });
  });
});
