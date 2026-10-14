import React from 'react';
import { Alert } from 'react-native';
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
  CameraCapturerConfiguration: class CameraCapturerConfiguration {},
  CameraDirection: { CameraFront: 1 },
  ChannelMediaOptions: class ChannelMediaOptions {},
  ChannelProfileType: { ChannelProfileCommunication: 0 },
  ClientRoleType: { ClientRoleBroadcaster: 1 },
  ConnectionChangedReasonType: { ConnectionChangedBannedByServer: 3 },
  OrientationMode: { OrientationModeAdaptive: 0 },
  RenderModeType: { RenderModeFit: 2 },
  VideoDimensions: class VideoDimensions {},
  VideoEncoderConfiguration: class VideoEncoderConfiguration {},
  VideoSourceType: { VideoSourceCamera: 0, VideoSourceScreen: 2 },
  createAgoraRtcEngine: () => ({
    initialize: jest.fn(),
    setCameraCapturerConfiguration: jest.fn(() => 0),
    setVideoEncoderConfiguration: jest.fn(() => 0),
    enableVideo: jest.fn(),
    enableAudio: jest.fn(),
    setDefaultAudioRouteToSpeakerphone: jest.fn(() => 0),
    enableLocalVideo: jest.fn(),
    startPreview: jest.fn(),
    updateChannelMediaOptions: jest.fn(() => 0),
    addListener: jest.fn(),
    registerEventHandler: jest.fn(),
    unregisterEventHandler: jest.fn(),
    joinChannel: jest.fn(() => 0),
    leaveChannel: jest.fn(),
    release: jest.fn(),
    muteLocalAudioStream: jest.fn(() => 0),
    muteLocalVideoStream: jest.fn(() => 0),
    startScreenCapture: jest.fn(() => 0),
    stopScreenCapture: jest.fn(() => 0),
    updateChannelMediaOptions: jest.fn(() => 0),
  }),
  RtcSurfaceView: () => null,
  RtcTextureView: () => null,
  RemoteVideoState: {
    RemoteVideoStateStopped: 0,
    RemoteVideoStateStarting: 1,
    RemoteVideoStateDecoding: 2,
  },
  RemoteVideoStateReason: {
    RemoteVideoStateReasonRemoteMuted: 5,
    RemoteVideoStateReasonRemoteOffline: 7,
  },
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

const fastRoomProps: {
  current: {
    sdkParams?: { useMultiViews?: boolean };
    roomParams?: { windowParams?: { containerSizeRatio?: number; chessboard?: boolean } };
  } | null;
} = {
  current: null,
};

jest.mock('../../lib/is-webview-native-available', () => ({
  isWebViewNativeAvailable: () => true,
}));

jest.mock('../../lib/agora-native', () => ({
  loadAgoraRtcModule: () => require('react-native-agora'),
  loadAgoraRtmModule: () => require('agora-react-native-rtm'),
  normalizeAgoraUid: (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null,
  isAgoraRtcNativeAvailable: () => true,
}));

jest.mock('../../lib/agora-rtc-session', () => ({
  ensureAgoraRtcEngine: (rtc: { createAgoraRtcEngine: () => unknown }) => ({
    engine: rtc.createAgoraRtcEngine(),
    initCode: 0,
  }),
  bindRtcEventDelegate: jest.fn(),
  leaveAgoraRtcChannel: jest.fn(),
  releaseAgoraRtcEngine: jest.fn(),
}));

jest.mock('@netless/react-native-fastboard', () => ({
  FastRoom: (props: {
    sdkParams?: { useMultiViews?: boolean };
    roomParams?: { windowParams?: { containerSizeRatio?: number; chessboard?: boolean } };
  }) => {
    const React = require('react');
    const { View } = require('react-native');
    fastRoomProps.current = props;
    return React.createElement(View, { testID: 'fast-room' });
  },
}));

describe('OnlineClassScreen', () => {
  beforeEach(() => {
    fastRoomProps.current = null;
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
          whiteboardWritable: false,
          tutorName: 'Ada Lovelace',
          subjectName: 'Algebra',
          participants: [{ userId: 8, name: 'Grace Hopper' }],
        },
      },
    });
  });

  it('shows the wrap-up warning and leaves', async () => {
    const onLeave = jest.fn();
    render(<OnlineClassScreen sessionId="9" displayName="Student" onLeave={onLeave} />);
    expect(await screen.findByLabelText('Wrap up')).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Algebra')).toBeTruthy();
    expect(screen.queryByText('GH')).toBeNull();
    expect(screen.queryByLabelText('End class')).toBeNull();
    fireEvent.press(screen.getByLabelText('Leave'));
    await waitFor(() => {
      expect(onLeave).toHaveBeenCalled();
    });
  });

  it('toggles the microphone and camera labels', async () => {
    render(<OnlineClassScreen sessionId="9" displayName="Student" onLeave={jest.fn()} />);
    await screen.findByLabelText('Wrap up');
    fireEvent.press(screen.getByLabelText('Mute mic'));
    expect(await screen.findByLabelText('Unmute mic')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Mute camera'));
    expect(await screen.findByLabelText('Unmute camera')).toBeTruthy();
  });

  it('shows only participant tiles with a loading spinner and no screen share', async () => {
    const joined = await mockJoin();
    mockJoin.mockResolvedValue({
      data: {
        joinOnlineClass: {
          ...joined.data.joinOnlineClass,
          participants: [
            { userId: 8, name: 'Grace Hopper' },
            { userId: 12, name: 'Ada Lovelace' },
          ],
        },
      },
    });
    render(<OnlineClassScreen sessionId="9" displayName="Student" onLeave={jest.fn()} />);
    expect(await screen.findByLabelText("Loading Ada Lovelace's video")).toBeTruthy();
    expect(screen.queryByLabelText('You')).toBeNull();
    expect(screen.queryByLabelText('Share screen')).toBeNull();
  });

  it('shares one whiteboard stage across screen sizes', async () => {
    mockJoin.mockResolvedValue({
      data: {
        joinOnlineClass: {
          appId: 'app',
          channelName: 'class-9',
          token: 'rtc',
          rtmToken: 'rtm',
          uid: 8,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          warnAt: new Date(Date.now() + 60_000).toISOString(),
          whiteboardAppIdentifier: 'board-app',
          whiteboardRegion: 'us-sv',
          whiteboardRoomUuid: 'room-1',
          whiteboardRoomToken: 'room-token',
          whiteboardError: null,
          whiteboardWritable: true,
          tutorName: 'Ada Lovelace',
          subjectName: 'Algebra',
          participants: [{ userId: 8, name: 'Ada Lovelace' }],
        },
      },
    });
    render(<OnlineClassScreen sessionId="9" displayName="Tutor" canEndClass onLeave={jest.fn()} />);
    fireEvent(await screen.findByTestId('whiteboard-board'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 600 } },
    });
    expect(await screen.findByTestId('fast-room')).toBeTruthy();
    expect(fastRoomProps.current?.sdkParams?.useMultiViews).toBe(true);
    expect(fastRoomProps.current?.roomParams?.windowParams).toEqual({
      containerSizeRatio: 1.5,
      chessboard: false,
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

  it('asks the tutor to confirm when more than 5 minutes remain', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const joined = await mockJoin();
    mockJoin.mockResolvedValue({
      data: {
        joinOnlineClass: {
          ...joined.data.joinOnlineClass,
          scheduledEnd: new Date(Date.now() + 30 * 60_000).toISOString(),
        },
      },
    });
    render(
      <OnlineClassScreen sessionId="9" displayName="Tutor" canEndClass onLeave={jest.fn()} />,
    );
    await screen.findByText('Ada Lovelace');
    fireEvent.press(screen.getByLabelText('End class'));

    expect(alert).toHaveBeenCalledWith('End class', 'Are you sure to end this class?', expect.any(Array));
    expect(mockEnd).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((button) => button.text === 'End class')?.onPress?.();
    expect(await screen.findByText('This class has ended')).toBeTruthy();
    expect(mockEnd).toHaveBeenCalledWith({ variables: { sessionId: '9' } });
    alert.mockRestore();
  });

  it('shows the ended screen instead of the class when the join is refused', async () => {
    mockJoin.mockRejectedValue(new Error('This class has ended'));
    render(<OnlineClassScreen sessionId="9" displayName="Tutor" canEndClass onLeave={jest.fn()} />);
    expect(await screen.findByText('This class has ended')).toBeTruthy();
    expect(screen.queryByLabelText('End class')).toBeNull();
  });
});
