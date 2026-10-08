import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm-sdk';
import { OnlineClassPage, resetOnlineClassChatForTests } from './OnlineClassPage';

const mockJoin = jest.fn();
const mockEnd = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  JOIN_ONLINE_CLASS: { kind: 'join' },
  END_ONLINE_CLASS: { kind: 'end' },
}));

jest.mock('@apollo/client', () => ({
  gql: (literals: TemplateStringsArray) => literals.join(''),
  useMutation: (document: { kind?: string }) =>
    document?.kind === 'end' ? [mockEnd, { loading: false }] : [mockJoin, { loading: false }],
}));

jest.mock('agora-rtc-sdk-ng', () => ({
  __esModule: true,
  default: {
    createClient: () => ({
      join: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      unpublish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    }),
    createMicrophoneAndCameraTracks: jest.fn(async () => [
      { setMuted: jest.fn().mockResolvedValue(undefined), close: jest.fn(), enabled: true },
      { play: jest.fn(), setMuted: jest.fn().mockResolvedValue(undefined), close: jest.fn(), enabled: true },
    ]),
    createScreenVideoTrack: jest.fn(),
  },
}));

jest.mock('agora-rtm-sdk', () => {
  const RTM = jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
  return {
    __esModule: true,
    RTM,
    RTMClient: RTM,
    default: { RTM, setParameter: jest.fn() },
  };
});

jest.mock('@netless/fastboard', () => ({
  createFastboard: jest.fn().mockResolvedValue({ destroy: jest.fn(), room: { setViewMode: jest.fn(), setWritable: jest.fn(), disableDeviceInputs: false } }),
  mount: jest.fn(() => ({ destroy: jest.fn() })),
}));

describe('OnlineClassPage', () => {
  beforeEach(() => {
    resetOnlineClassChatForTests();
    mockJoin.mockReset();
    mockEnd.mockReset();
    (AgoraRTM.RTM as unknown as jest.Mock).mockClear();
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
          scheduledEnd: new Date(Date.now() + 30_000).toISOString(),
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

  it('shows the wrap-up warning and leaves the class', async () => {
    const onLeave = jest.fn();
    render(<OnlineClassPage sessionId="9" displayName="Tutor" onLeave={onLeave} />);

    expect(await screen.findByRole('dialog', { name: 'Wrap up' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeTruthy();
    expect(screen.getByText('Algebra')).toBeTruthy();
    expect(screen.queryByText('GH')).toBeNull();
    expect(screen.getByText('Wrap up in the next 5 minutes.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(onLeave).toHaveBeenCalled();
  });

  it('shows End class only for the tutor and closes the room', async () => {
    render(<OnlineClassPage sessionId="9" displayName="Student" onLeave={jest.fn()} />);
    await screen.findByRole('dialog', { name: 'Wrap up' });
    expect(screen.queryByRole('button', { name: 'End class' })).toBeNull();

    render(<OnlineClassPage sessionId="9" displayName="Tutor" canEndClass onLeave={jest.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'End class' }));
    expect(await screen.findByText('This class has ended')).toBeTruthy();
    expect(mockEnd).toHaveBeenCalledWith({ variables: { sessionId: '9' } });
  });

  it('reuses the chat client when the same student joins again', async () => {
    const first = render(<OnlineClassPage sessionId="9" displayName="Student" onLeave={jest.fn()} />);
    await screen.findByRole('dialog', { name: 'Wrap up' });
    first.unmount();

    render(<OnlineClassPage sessionId="9" displayName="Student" onLeave={jest.fn()} />);
    await screen.findByRole('dialog', { name: 'Wrap up' });

    expect(AgoraRTM.RTM).toHaveBeenCalledTimes(1);
  });

  it('toggles the microphone and camera labels', async () => {
    render(<OnlineClassPage sessionId="9" displayName="Tutor" onLeave={jest.fn()} />);
    await screen.findByRole('dialog', { name: 'Wrap up' });
    await waitFor(() => {
      expect(AgoraRTC.createMicrophoneAndCameraTracks).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mute mic' }));
    expect(await screen.findByRole('button', { name: 'Unmute mic' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mute camera' }));
    expect(await screen.findByRole('button', { name: 'Unmute camera' })).toBeTruthy();
  });

  it('sends a chat message', async () => {
    render(<OnlineClassPage sessionId="9" displayName="Tutor" onLeave={jest.fn()} />);
    await screen.findByRole('dialog', { name: 'Wrap up' });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello class' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => {
      expect(screen.getByText('Hello class')).toBeTruthy();
    });
  });
});
