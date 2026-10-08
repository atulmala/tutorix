import React, { useEffect, useRef, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation } from '@apollo/client';
import {
  CameraCapturerConfiguration,
  CameraDirection,
  ChannelMediaOptions,
  ChannelProfileType,
  ClientRoleType,
  ConnectionChangedReasonType,
  createAgoraRtcEngine,
  OrientationMode,
  RenderModeType,
  RtcSurfaceView,
  VideoDimensions,
  VideoEncoderConfiguration,
  VideoSourceType,
} from 'react-native-agora';
import { createAgoraRtmClient, RtmConfig } from 'agora-react-native-rtm';
import { FastRoom } from '@netless/react-native-fastboard';
import { END_ONLINE_CLASS, JOIN_ONLINE_CLASS } from '@tutorix/shared-graphql/queries';
import {
  isOnlineClassEndedMessage,
  nameInitials,
  ONLINE_CLASS_WRAP_UP_MESSAGE,
  onlineClassEndedPayload,
  onlineClassScreenSharePayload,
  onlineClassScreenShareState,
} from '@tutorix/shared-utils/online-class-window';

type JoinPayload = {
  appId: string;
  channelName: string;
  token: string;
  rtmToken: string;
  uid: number;
  expiresAt: string;
  warnAt: string;
  whiteboardAppIdentifier?: string | null;
  whiteboardRegion?: string | null;
  whiteboardRoomUuid?: string | null;
  whiteboardRoomToken?: string | null;
  whiteboardError?: string | null;
  whiteboardWritable?: boolean;
  tutorName?: string | null;
  subjectName?: string | null;
  participants?: { userId: number; name: string }[];
};

function rosterName(
  participants: { userId: number; name: string }[] | undefined,
  uid: number,
  fallback: string,
): string {
  return participants?.find((member) => member.userId === uid)?.name?.trim() || fallback;
}

type ChatLine = { id: string; from: string; text: string };

type OnlineClassScreenProps = {
  sessionId: string;
  displayName: string;
  canEndClass?: boolean;
  onLeave: () => void;
};

async function requestCallPermissions(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);
}

export const OnlineClassScreen: React.FC<OnlineClassScreenProps> = ({
  sessionId,
  displayName,
  canEndClass = false,
  onLeave,
}) => {
  const [joinOnlineClass] = useMutation(JOIN_ONLINE_CLASS);
  const [endOnlineClass] = useMutation(END_ONLINE_CLASS);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [wrapUp, setWrapUp] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [sharing, setSharing] = useState(false);
  const [remoteSharingUid, setRemoteSharingUid] = useState<number | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [ending, setEnding] = useState(false);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [board, setBoard] = useState<JoinPayload | null>(null);
  const [whiteboardNote, setWhiteboardNote] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState<{ tutorName: string; subjectName: string } | null>(
    null,
  );
  const engineRef = useRef<ReturnType<typeof createAgoraRtcEngine> | null>(null);
  const rtmRef = useRef<ReturnType<typeof createAgoraRtmClient> | null>(null);
  const channelRef = useRef('');
  const nameRef = useRef(displayName);
  const finishRef = useRef<() => void>(() => undefined);
  nameRef.current = displayName;

  useEffect(() => {
    let cancelled = false;
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    const finish = () => {
      if (cancelled) {
        return;
      }
      setEnded(true);
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      engineRef.current = null;
      void rtmRef.current?.logout();
      rtmRef.current = null;
    };
    finishRef.current = finish;

    void (async () => {
      try {
        await requestCallPermissions();
        const { data } = await joinOnlineClass({ variables: { sessionId } });
        const creds = data?.joinOnlineClass as JoinPayload | undefined;
        if (cancelled || !creds) {
          return;
        }
        if (creds.whiteboardError) {
          setWhiteboardNote(creds.whiteboardError);
        }
        setBoard(creds);
        setClassTitle({
          tutorName: creds.tutorName?.trim() || 'Tutor',
          subjectName: creds.subjectName?.trim() || 'Class',
        });
        const warnIn = new Date(creds.warnAt).getTime() - Date.now();
        const endIn = new Date(creds.expiresAt).getTime() - Date.now();
        if (warnIn <= 0) {
          setWrapUp(true);
        } else {
          timers.push(setTimeout(() => setWrapUp(true), warnIn));
        }
        timers.push(setTimeout(finish, Math.max(0, endIn)));
        if (endIn <= 0) {
          finish();
          return;
        }

        channelRef.current = creds.channelName;
        const engine = createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({ appId: creds.appId });
        const camera = new CameraCapturerConfiguration();
        camera.cameraDirection = CameraDirection.CameraFront;
        camera.followEncodeDimensionRatio = false;
        engine.setCameraCapturerConfiguration(camera);
        const dimensions = new VideoDimensions();
        dimensions.width = 480;
        dimensions.height = 640;
        const encoder = new VideoEncoderConfiguration();
        encoder.dimensions = dimensions;
        encoder.orientationMode = OrientationMode.OrientationModeAdaptive;
        engine.setVideoEncoderConfiguration(encoder);
        engine.enableVideo();
        engine.enableAudio();
        engine.startPreview();
        engine.addListener('onUserJoined', (_connection, uid) => {
          setRemoteUids((current) => (current.includes(uid) ? current : [...current, uid]));
        });
        engine.addListener('onUserOffline', (_connection, uid) => {
          setRemoteUids((current) => current.filter((item) => item !== uid));
        });
        engine.addListener('onConnectionStateChanged', (_connection, _state, reason) => {
          if (reason === ConnectionChangedReasonType.ConnectionChangedBannedByServer) {
            finish();
          }
        });
        engine.joinChannel(creds.token, creds.channelName, creds.uid, {
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishCameraTrack: true,
          publishMicrophoneTrack: true,
        });

        const rtmConfig = new RtmConfig();
        rtmConfig.appId = creds.appId;
        rtmConfig.userId = String(creds.uid);
        const rtm = createAgoraRtmClient(rtmConfig);
        rtmRef.current = rtm;
        rtm.addEventListener('message', (event: { message?: string; publisher?: string }) => {
          const raw = typeof event.message === 'string' ? event.message : '';
          if (isOnlineClassEndedMessage(raw)) {
            finish();
            return;
          }
          const sharingState = onlineClassScreenShareState(raw);
          if (sharingState != null) {
            const uid = Number(event.publisher);
            setRemoteSharingUid(sharingState && Number.isInteger(uid) ? uid : null);
            return;
          }
          let text = raw;
          let from = event.publisher ?? 'Classmate';
          try {
            const parsed = JSON.parse(raw) as { text?: string; name?: string };
            text = parsed.text ?? raw;
            from = parsed.name || from;
          } catch {
            text = raw;
          }
          if (!text) {
            return;
          }
          setLines((current) => [...current, { id: `${from}-${current.length}`, from, text }]);
        });
        await rtm.login({ token: creds.rtmToken });
        await rtm.subscribe(creds.channelName);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unable to join this class');
        }
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      engineRef.current = null;
      void rtmRef.current?.logout();
      rtmRef.current = null;
    };
  }, [joinOnlineClass, sessionId]);

  const sendChat = async () => {
    const text = draft.trim();
    if (!text || !rtmRef.current || !channelRef.current) {
      return;
    }
    setDraft('');
    await rtmRef.current.publish(
      channelRef.current,
      JSON.stringify({ text, name: nameRef.current }),
    );
    setLines((current) => [...current, { id: `me-${current.length}`, from: nameRef.current, text }]);
  };

  const endClass = async () => {
    if (!canEndClass || ending) {
      return;
    }
    setEnding(true);
    setError(null);
    try {
      if (rtmRef.current && channelRef.current) {
        try {
          await rtmRef.current.publish(channelRef.current, onlineClassEndedPayload());
        } catch {
          // The server kick still closes the room if chat delivery fails.
        }
      }
      await endOnlineClass({ variables: { sessionId } });
      finishRef.current();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to end this class');
    } finally {
      setEnding(false);
    }
  };

  const publishMedia = (screen: boolean) => {
    const options = new ChannelMediaOptions();
    options.publishMicrophoneTrack = true;
    options.publishCameraTrack = !screen;
    options.publishScreenCaptureVideo = screen;
    options.publishScreenCaptureAudio = false;
    engineRef.current?.updateChannelMediaOptions(options);
  };

  const publishScreenState = async (active: boolean) => {
    if (!rtmRef.current || !channelRef.current) {
      return;
    }
    try {
      await rtmRef.current.publish(channelRef.current, onlineClassScreenSharePayload(active));
    } catch {
      // The screen track still switches even if the stage signal is missed.
    }
  };

  const toggleMic = () => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    const next = !micOn;
    const result = engine.muteLocalAudioStream(!next);
    if (result < 0) {
      setError('Unable to change the microphone');
      return;
    }
    setMicOn(next);
  };

  const toggleCamera = () => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    const next = !camOn;
    const result = engine.muteLocalVideoStream(!next);
    if (result < 0) {
      setError('Unable to change the camera');
      return;
    }
    setCamOn(next);
  };

  const toggleScreen = () => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    if (sharing) {
      engine.stopScreenCapture();
      publishMedia(false);
      setSharing(false);
      void publishScreenState(false);
      return;
    }
    const started = engine.startScreenCapture({ captureAudio: false, captureVideo: true });
    if (started < 0) {
      setError('Unable to share the screen');
      return;
    }
    publishMedia(true);
    setSharing(true);
    void publishScreenState(true);
  };

  if (ended) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.ended}>
          <Text style={styles.endedTitle}>This class has ended</Text>
          <Pressable accessibilityRole="button" onPress={onLeave}>
            <Text style={styles.leave}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const canDraw = canEndClass || Boolean(board?.whiteboardWritable);

  return (
    <SafeAreaView style={styles.safe}>
    <View style={styles.page}>
      {classTitle ? (
        <View style={styles.title}>
          <Text style={styles.tutorName}>{classTitle.tutorName}</Text>
          <Text style={styles.subjectName}>{classTitle.subjectName}</Text>
        </View>
      ) : null}
      {wrapUp ? (
        <View accessibilityRole="alert" accessibilityLabel="Wrap up" style={styles.wrapUp}>
          <Text style={styles.wrapUpText}>{ONLINE_CLASS_WRAP_UP_MESSAGE}</Text>
          <Pressable onPress={() => setWrapUp(false)}>
            <Text style={styles.wrapUpOk}>OK</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {whiteboardNote ? <Text style={styles.note}>{whiteboardNote}</Text> : null}
      <View style={styles.board}>
        {board?.whiteboardAppIdentifier && board.whiteboardRoomUuid && board.whiteboardRoomToken ? (
          <FastRoom
            style={{ container: { flex: 1 }, fastRoom: { flex: 1 } }}
            sdkParams={{
              appIdentifier: board.whiteboardAppIdentifier,
              region: (board.whiteboardRegion || 'us-sv') as 'us-sv',
              useMultiViews: false,
            }}
            roomParams={{
              uid: String(board.uid),
              uuid: board.whiteboardRoomUuid,
              roomToken: board.whiteboardRoomToken,
            }}
            displayConfig={{
              showApplianceTools: canDraw,
              showRedoUndo: canDraw,
              showPageIndicator: canDraw,
            }}
            joinRoomSuccessCallback={(fastRoom) => {
              const room = fastRoom?.room;
              if (!room) {
                return;
              }
              if (canDraw) {
                void room.setWritable(true);
                return;
              }
              void room.setWritable(false);
              room.disableDeviceInputs(true);
            }}
          />
        ) : (
          <Text style={styles.note}>Whiteboard will appear when the room is ready.</Text>
        )}
      </View>
      {sharing ? (
        <RtcSurfaceView
          style={styles.screen}
          canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceScreen }}
        />
      ) : null}
      {remoteSharingUid != null ? (
        <RtcSurfaceView style={styles.screen} canvas={{ uid: remoteSharingUid }} />
      ) : null}
      <ScrollView horizontal style={styles.videos} contentContainerStyle={styles.videoRow}>
        {remoteUids.map((uid) => {
          const name = rosterName(board?.participants, uid, '');
          return (
            <View key={uid} style={styles.videoItem}>
              <RtcSurfaceView
                style={styles.tile}
                canvas={{ uid, renderMode: RenderModeType.RenderModeFit }}
              />
              {nameInitials(name) ? (
                <Text style={styles.initials} accessibilityLabel={name}>
                  {nameInitials(name)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      {chatOpen ? (
        <View style={styles.chat}>
          {lines.map((line) => (
            <Text key={line.id} style={styles.chatLine}>
              {line.from}: {line.text}
            </Text>
          ))}
          <View style={styles.chatForm}>
            <TextInput
              accessibilityLabel="Message"
              value={draft}
              onChangeText={setDraft}
              style={styles.input}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => void sendChat()}>
              <Text style={styles.send}>Send</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={micOn ? 'Mute mic' : 'Unmute mic'} onPress={toggleMic}>
          <Text style={styles.action}>{micOn ? 'Mute mic' : 'Unmute mic'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={camOn ? 'Mute camera' : 'Unmute camera'} onPress={toggleCamera}>
          <Text style={styles.action}>{camOn ? 'Mute camera' : 'Unmute camera'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={sharing ? 'Stop sharing' : 'Share screen'} onPress={toggleScreen}>
          <Text style={styles.action}>{sharing ? 'Stop sharing' : 'Share screen'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={chatOpen ? 'Hide chat' : 'Open chat'} onPress={() => setChatOpen((open) => !open)}>
          <Text style={styles.action}>{chatOpen ? 'Hide chat' : 'Open chat'}</Text>
        </Pressable>
        {canEndClass ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End class"
            disabled={ending}
            onPress={() => void endClass()}
          >
            <Text style={styles.end}>End class</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave"
          onPress={() => {
            onLeave();
          }}
        >
          <Text style={styles.leave}>Leave</Text>
        </Pressable>
      </View>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#e8f4ff' },
  page: { flex: 1, backgroundColor: '#e8f4ff', padding: 12, gap: 8 },
  title: { alignSelf: 'stretch' },
  tutorName: { color: '#143055', fontSize: 18, fontWeight: '800' },
  subjectName: { color: '#475569', fontSize: 14, fontWeight: '600' },
  wrapUp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 12,
  },
  wrapUpText: { flex: 1, color: '#7c2d12', fontWeight: '700' },
  wrapUpOk: { color: '#2563eb', fontWeight: '700', marginLeft: 8 },
  error: { color: '#b91c1c', fontWeight: '700' },
  note: { color: '#92400e', fontWeight: '600' },
  board: { flex: 1, minHeight: 280, borderRadius: 16, overflow: 'visible', backgroundColor: '#fff' },
  videos: { maxHeight: 176 },
  videoRow: { gap: 8 },
  videoItem: { width: 104, alignItems: 'center' },
  tile: { width: 104, height: 144, borderRadius: 12, backgroundColor: '#0f172a' },
  screen: { height: 180, borderRadius: 12, backgroundColor: '#0f172a' },
  initials: { marginTop: 4, color: '#143055', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  chat: { backgroundColor: '#fff', borderRadius: 16, padding: 12, maxHeight: 180 },
  chatLine: { color: '#143055', marginBottom: 4 },
  chatForm: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  send: { color: '#2563eb', fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { color: '#143055', fontWeight: '700', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  end: { color: '#fff', fontWeight: '700', backgroundColor: '#b91c1c', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  leave: { color: '#fff', fontWeight: '700', backgroundColor: '#143055', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  ended: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f4ff', gap: 12 },
  endedTitle: { fontSize: 18, fontWeight: '800', color: '#143055' },
});
