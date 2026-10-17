import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { androidEdgeToEdgeEnabled, SafeAreaView } from '../SafeAreaView';
import { useMutation } from '@apollo/client';
import type { IRtcEngine, IRtcEngineEventHandler } from 'react-native-agora';
import type { RTMClient } from 'agora-react-native-rtm';
import { FastRoom } from '@netless/react-native-fastboard';
import { END_ONLINE_CLASS, JOIN_ONLINE_CLASS } from '@tutorix/shared-graphql/queries';
import {
  fitWhiteboardStage,
  isOnlineClassEndedError,
  isOnlineClassEndedMessage,
  nameInitials,
  ONLINE_CLASS_END_CONFIRM_MESSAGE,
  ONLINE_CLASS_ENDED_MESSAGE,
  ONLINE_CLASS_WHITEBOARD_HEIGHT_RATIO,
  ONLINE_CLASS_WRAP_UP_MESSAGE,
  onlineClassEndedPayload,
  onlineClassHasTimeLeft,
  onlineClassScreenShareState,
} from '@tutorix/shared-utils/online-class-window';
import {
  loadAgoraRtcModule,
  loadAgoraRtmModule,
  normalizeAgoraUid,
} from '../../lib/agora-native';
import {
  bindRtcEventDelegate,
  ensureAgoraRtcEngine,
  leaveAgoraRtcChannel,
  releaseAgoraRtcEngine,
} from '../../lib/agora-rtc-session';
import { ensureOnlineClassCallPermissions } from '../../lib/online-class-call-permissions';
import { isWebViewNativeAvailable } from '../../lib/is-webview-native-available';

type AgoraRtcRuntime = ReturnType<typeof loadAgoraRtcModule>;

type JoinPayload = {
  appId: string;
  channelName: string;
  token: string;
  rtmToken: string;
  uid: number;
  expiresAt: string;
  warnAt: string;
  scheduledEnd?: string | null;
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

function pickRtcVideoView(rtc: AgoraRtcRuntime | null) {
  if (!rtc) {
    return null;
  }
  return rtc.RtcSurfaceView;
}

function seedRemoteUidsFromRoster(
  participants: { userId: number; name: string }[] | undefined,
  localUid: number,
): number[] {
  return (participants ?? [])
    .map((member) => member.userId)
    .filter((userId) => userId !== localUid);
}

type ChatLine = { id: string; from: string; text: string };

type RemoteVideoStatus = 'loading' | 'live' | 'off';

type OnlineClassScreenProps = {
  sessionId: string;
  displayName: string;
  canEndClass?: boolean;
  onLeave: () => void;
};

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
  const [remoteSharingUid, setRemoteSharingUid] = useState<number | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [ending, setEnding] = useState(false);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [remoteVideoGeneration, setRemoteVideoGeneration] = useState<Record<number, number>>({});
  const [remoteVideoStatus, setRemoteVideoStatus] = useState<Record<number, RemoteVideoStatus>>({});
  const [board, setBoard] = useState<JoinPayload | null>(null);
  const [whiteboardNote, setWhiteboardNote] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState<{ tutorName: string; subjectName: string } | null>(
    null,
  );
  const [stage, setStage] = useState<{ width: number; height: number } | null>(null);
  const [agoraRtc, setAgoraRtc] = useState<AgoraRtcRuntime | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const engineRef = useRef<IRtcEngine | null>(null);
  const rtmRef = useRef<RTMClient | null>(null);
  const agoraRtcRef = useRef<AgoraRtcRuntime | null>(null);
  const channelRef = useRef('');
  const localUidRef = useRef(0);
  const nameRef = useRef(displayName);
  const finishRef = useRef<() => void>(() => undefined);
  const joinedChannelRef = useRef(false);
  const rtcPublishStartedRef = useRef(false);
  const rtmStartedRef = useRef(false);
  nameRef.current = displayName;

  const refreshLocalPreview = () => {
    const engine = engineRef.current;
    const rtc = agoraRtcRef.current;
    if (!engine || !rtc) {
      return;
    }
    engine.enableLocalVideo(true);
    engine.muteLocalVideoStream(false);
    engine.muteLocalAudioStream(false);
    if (joinedChannelRef.current) {
      // In-channel: local video is published + bound via RtcSurfaceView. startPreview(sourceType)
      // throws on Android (Iris RtcEngine_startPreview_*).
      return;
    }
    try {
      const legacy = engine as IRtcEngine & { startPreviewWithoutSourceType?: () => number };
      if (
        Platform.OS === 'android' &&
        typeof legacy.startPreviewWithoutSourceType === 'function'
      ) {
        legacy.startPreviewWithoutSourceType();
      } else {
        engine.startPreview();
      }
    } catch {
      return;
    }
  };

  const publishCameraToChannel = () => {
    const engine = engineRef.current;
    const rtc = agoraRtcRef.current;
    if (!engine || !rtc || !joinedChannelRef.current) {
      return;
    }
    const options = new rtc.ChannelMediaOptions();
    options.channelProfile = rtc.ChannelProfileType.ChannelProfileCommunication;
    options.clientRoleType = rtc.ClientRoleType.ClientRoleBroadcaster;
    options.publishCameraTrack = true;
    options.publishMicrophoneTrack = true;
    options.autoSubscribeAudio = true;
    options.autoSubscribeVideo = true;
    engine.updateChannelMediaOptions(options);
  };

  useEffect(() => {
    let cancelled = false;
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    const finish = () => {
      if (cancelled) {
        return;
      }
      setEnded(true);
      bindRtcEventDelegate(engineRef.current, null);
      releaseAgoraRtcEngine(engineRef.current);
      engineRef.current = null;
      void rtmRef.current?.logout();
      rtmRef.current = null;
    };
    finishRef.current = finish;

    void (async () => {
      try {
        const { data } = await joinOnlineClass({ variables: { sessionId } });
        const creds = data?.joinOnlineClass as JoinPayload | undefined;
        if (cancelled || !creds) {
          return;
        }
        await ensureOnlineClassCallPermissions();
        if (cancelled) {
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

        setError(null);
        rtcPublishStartedRef.current = false;
        rtmStartedRef.current = false;
        channelRef.current = creds.channelName;
        localUidRef.current = normalizeAgoraUid(creds.uid) ?? creds.uid;
        const rosterRemoteUids = seedRemoteUidsFromRoster(
          creds.participants,
          localUidRef.current,
        );
        if (rosterRemoteUids.length > 0) {
          setRemoteUids(rosterRemoteUids);
        }
        const rtc = loadAgoraRtcModule();
        agoraRtcRef.current = rtc;
        if (!cancelled) {
          setAgoraRtc(rtc);
        }
        const { engine, initCode } = ensureAgoraRtcEngine(rtc, creds.appId);
        engineRef.current = engine;
        if (typeof initCode === 'number' && initCode !== 0) {
          setError(`Video engine failed to start (code ${initCode}). Leave and rejoin.`);
          return;
        }
        const rememberRemote = (rawUid: unknown) => {
          const uid = normalizeAgoraUid(rawUid);
          if (uid == null || uid === localUidRef.current) {
            return;
          }
          setRemoteUids((current) => (current.includes(uid) ? current : [...current, uid]));
        };
        const bumpRemoteVideo = (rawUid: unknown) => {
          const uid = normalizeAgoraUid(rawUid);
          if (uid == null) {
            return;
          }
          setRemoteVideoGeneration((current) => ({
            ...current,
            [uid]: (current[uid] ?? 0) + 1,
          }));
        };
        const markRemoteVideo = (rawUid: unknown, status: RemoteVideoStatus) => {
          const uid = normalizeAgoraUid(rawUid);
          if (uid == null) {
            return;
          }
          setRemoteVideoStatus((current) =>
            current[uid] === status ? current : { ...current, [uid]: status },
          );
        };
        const connectClassChat = async () => {
          if (cancelled) {
            return;
          }
          const rtmSdk = loadAgoraRtmModule();
          const rtmConfig = new rtmSdk.RtmConfig();
          rtmConfig.appId = creds.appId;
          rtmConfig.userId = String(creds.uid);
          const rtm = rtmSdk.createAgoraRtmClient(rtmConfig);
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
        };
        const completeRtcJoin = () => {
          if (rtcPublishStartedRef.current) {
            return;
          }
          rtcPublishStartedRef.current = true;
          joinedChannelRef.current = true;
          publishCameraToChannel();
          if (!rtmStartedRef.current) {
            rtmStartedRef.current = true;
            void connectClassChat().catch(() => undefined);
          }
        };
        const agoraHandler: IRtcEngineEventHandler = {
          onUserJoined(_connection, uid) {
            rememberRemote(uid);
          },
          onUserOffline(_connection, uid) {
            const normalized = normalizeAgoraUid(uid);
            if (normalized == null) {
              return;
            }
            setRemoteUids((current) => current.filter((item) => item !== normalized));
            markRemoteVideo(normalized, 'loading');
          },
          onRemoteVideoStateChanged(_connection, uid, state, reason) {
            if (state === rtc.RemoteVideoState.RemoteVideoStateStarting) {
              rememberRemote(uid);
              markRemoteVideo(uid, 'loading');
              return;
            }
            if (state === rtc.RemoteVideoState.RemoteVideoStateDecoding) {
              rememberRemote(uid);
              markRemoteVideo(uid, 'live');
              bumpRemoteVideo(uid);
              return;
            }
            if (state === rtc.RemoteVideoState.RemoteVideoStateStopped) {
              const cameraOff =
                reason === rtc.RemoteVideoStateReason.RemoteVideoStateReasonRemoteMuted ||
                reason === rtc.RemoteVideoStateReason.RemoteVideoStateReasonRemoteOffline;
              markRemoteVideo(uid, cameraOff ? 'off' : 'loading');
            }
          },
          onFirstRemoteVideoFrame(_connection, uid) {
            rememberRemote(uid);
            markRemoteVideo(uid, 'live');
          },
          onConnectionStateChanged(_connection, state, reason) {
            if (state === rtc.ConnectionStateType.ConnectionStateConnected) {
              completeRtcJoin();
            }
            if (reason === rtc.ConnectionChangedReasonType.ConnectionChangedBannedByServer) {
              finish();
            }
          },
          onJoinChannelSuccess() {
            completeRtcJoin();
          },
        };
        bindRtcEventDelegate(engine, agoraHandler);
        const camera = new rtc.CameraCapturerConfiguration();
        camera.cameraDirection = rtc.CameraDirection.CameraFront;
        camera.followEncodeDimensionRatio = false;
        engine.setCameraCapturerConfiguration(camera);
        const dimensions = new rtc.VideoDimensions();
        dimensions.width = 480;
        dimensions.height = 640;
        const encoder = new rtc.VideoEncoderConfiguration();
        encoder.dimensions = dimensions;
        encoder.orientationMode = rtc.OrientationMode.OrientationModeAdaptive;
        engine.setVideoEncoderConfiguration(encoder);
        engine.enableVideo();
        engine.enableAudio();
        engine.setDefaultAudioRouteToSpeakerphone(true);
        refreshLocalPreview();
        const joinOptions = new rtc.ChannelMediaOptions();
        joinOptions.channelProfile = rtc.ChannelProfileType.ChannelProfileCommunication;
        joinOptions.clientRoleType = rtc.ClientRoleType.ClientRoleBroadcaster;
        joinOptions.publishCameraTrack = true;
        joinOptions.publishMicrophoneTrack = true;
        joinOptions.autoSubscribeAudio = true;
        joinOptions.autoSubscribeVideo = true;
        const joinResult = engine.joinChannel(
          creds.token,
          creds.channelName,
          localUidRef.current,
          joinOptions,
        );
        if (typeof joinResult === 'number' && joinResult !== 0) {
          setError(`Could not join video (code ${joinResult}). Leave and try again.`);
        } else if (joinResult === 0 || joinResult === undefined) {
          completeRtcJoin();
        }
      } catch (caught) {
        if (cancelled) {
          return;
        }
        if (isOnlineClassEndedError(caught)) {
          setEnded(true);
          return;
        }
        setError(caught instanceof Error ? caught.message : 'Unable to join this class');
      }
    })();

    return () => {
      cancelled = true;
      joinedChannelRef.current = false;
      rtcPublishStartedRef.current = false;
      rtmStartedRef.current = false;
      timers.forEach(clearTimeout);
      bindRtcEventDelegate(engineRef.current, null);
      leaveAgoraRtcChannel(engineRef.current);
      engineRef.current = null;
      void rtmRef.current?.logout();
      rtmRef.current = null;
    };
  }, [joinOnlineClass, sessionId]);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

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

  const endClass = () => {
    if (!canEndClass || ending) {
      return;
    }
    if (!onlineClassHasTimeLeft(board?.scheduledEnd)) {
      void endClassNow();
      return;
    }
    Alert.alert('End class', ONLINE_CLASS_END_CONFIRM_MESSAGE, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End class', style: 'destructive', onPress: () => void endClassNow() },
    ]);
  };

  const endClassNow = async () => {
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

  if (ended) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.ended}>
          <Text style={styles.endedTitle}>{ONLINE_CLASS_ENDED_MESSAGE}</Text>
          <Pressable accessibilityRole="button" onPress={onLeave}>
            <Text style={styles.leave}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const canDraw = canEndClass || Boolean(board?.whiteboardWritable);
  const webViewReady = isWebViewNativeAvailable();
  const RenderModeType = agoraRtc?.RenderModeType;
  const RtcVideoView = pickRtcVideoView(agoraRtc);

  const onBoardLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const next = fitWhiteboardStage(width, height);
    setStage((current) => {
      if (
        current &&
        Math.abs(current.width - next.width) < 1 &&
        Math.abs(current.height - next.height) < 1
      ) {
        return current;
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' || androidEdgeToEdgeEnabled() ? 'padding' : undefined}
    >
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
      <View
        testID="whiteboard-board"
        style={[styles.board, keyboardOpen && styles.boardWhileTyping]}
        onLayout={onBoardLayout}
      >
        {!webViewReady ? (
          <Text style={styles.note}>
            Whiteboard is unavailable on this build. Reinstall the app after a full native rebuild.
          </Text>
        ) : null}
        {webViewReady &&
        stage &&
        stage.width > 0 &&
        board?.whiteboardAppIdentifier &&
        board.whiteboardRoomUuid &&
        board.whiteboardRoomToken ? (
          <FastRoom
            style={{
              container: { width: stage.width, height: stage.height },
              fastRoom: { width: stage.width, height: stage.height },
            }}
            sdkParams={{
              appIdentifier: board.whiteboardAppIdentifier,
              region: (board.whiteboardRegion || 'us-sv') as 'us-sv',
              useMultiViews: true,
            }}
            roomParams={{
              uid: String(board.uid),
              uuid: board.whiteboardRoomUuid,
              roomToken: board.whiteboardRoomToken,
              windowParams: {
                containerSizeRatio: ONLINE_CLASS_WHITEBOARD_HEIGHT_RATIO,
                chessboard: false,
              },
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
      {remoteSharingUid != null && RtcVideoView ? (
        <View collapsable={false} style={styles.screenFrame}>
          <RtcVideoView style={styles.rtcSurface} canvas={{ uid: remoteSharingUid }} />
        </View>
      ) : null}
      <ScrollView horizontal style={styles.videos} contentContainerStyle={styles.videoRow}>
        {remoteUids.map((uid) => {
          const name = rosterName(board?.participants, uid, '');
          const videoKey = remoteVideoGeneration[uid] ?? 0;
          const status = remoteVideoStatus[uid] ?? 'loading';
          return (
            <View key={`${uid}-${videoKey}`} collapsable={false} style={styles.videoItem}>
              <View collapsable={false} style={styles.tileFrame}>
                {RtcVideoView && RenderModeType && status !== 'off' ? (
                  <RtcVideoView
                    zOrderMediaOverlay={Platform.OS === 'android'}
                    style={status === 'live' ? styles.rtcSurface : styles.rtcSurfacePending}
                    canvas={{ uid, renderMode: RenderModeType.RenderModeFit }}
                  />
                ) : null}
                {status === 'loading' ? (
                  <View style={styles.tileOverlay}>
                    <ActivityIndicator
                      color="#ffffff"
                      accessibilityLabel={name ? `Loading ${name}'s video` : 'Loading video'}
                    />
                  </View>
                ) : null}
                {status === 'off' ? (
                  <View style={styles.tileOverlay}>
                    <Text style={styles.cameraOff}>Camera off</Text>
                  </View>
                ) : null}
              </View>
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
        <Pressable accessibilityRole="button" accessibilityLabel={chatOpen ? 'Hide chat' : 'Open chat'} onPress={() => setChatOpen((open) => !open)}>
          <Text style={styles.action}>{chatOpen ? 'Hide chat' : 'Open chat'}</Text>
        </Pressable>
        {canEndClass ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End class"
            disabled={ending}
            onPress={endClass}
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
    </KeyboardAvoidingView>
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
  board: {
    flex: 1,
    minHeight: 280,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  boardWhileTyping: { minHeight: 0 },
  videos: { maxHeight: 176 },
  videoRow: { gap: 8 },
  videoItem: { width: 104, alignItems: 'center' },
  tileFrame: {
    width: 104,
    height: 144,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  screenFrame: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  /** No background on TextureView / SurfaceView (Android throws otherwise). */
  rtcSurface: { width: '100%', height: '100%' },
  /**
   * Keeps the remote renderer attached while loading. Android draws the video
   * surface above React views, so it must stay tiny for the spinner to show.
   */
  rtcSurfacePending: { width: 1, height: 1 },
  tileOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  cameraOff: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
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
