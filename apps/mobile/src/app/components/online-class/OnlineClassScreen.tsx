import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from '../SafeAreaView';
import { useMutation } from '@apollo/client';
import type { IRtcEngine, IRtcEngineEventHandler } from 'react-native-agora';
import type { IRtmClient } from 'agora-react-native-rtm';
import { FastRoom } from '@netless/react-native-fastboard';
import { END_ONLINE_CLASS, JOIN_ONLINE_CLASS } from '@tutorix/shared-graphql/queries';
import {
  fitWhiteboardStage,
  isOnlineClassEndedMessage,
  nameInitials,
  ONLINE_CLASS_WHITEBOARD_HEIGHT_RATIO,
  ONLINE_CLASS_WRAP_UP_MESSAGE,
  onlineClassEndedPayload,
  onlineClassScreenSharePayload,
  onlineClassScreenShareState,
} from '@tutorix/shared-utils/online-class-window';
import {
  isAgoraRtcNativeAvailable,
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

// #region agent log
function debugOnlineClassLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  const payload = {
    sessionId: 'ec2e4a',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
    runId: 'post-fix',
  };
  console.log('[debug-ec2e4a]', message, data);
  fetch('http://127.0.0.1:7676/ingest/864fd570-d922-464e-bce0-8023d73126b8', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ec2e4a' },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}
// #endregion

type ChatLine = { id: string; from: string; text: string };

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
  const [sharing, setSharing] = useState(false);
  const [remoteSharingUid, setRemoteSharingUid] = useState<number | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [ending, setEnding] = useState(false);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [remoteVideoGeneration, setRemoteVideoGeneration] = useState<Record<number, number>>({});
  const [board, setBoard] = useState<JoinPayload | null>(null);
  const [whiteboardNote, setWhiteboardNote] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState<{ tutorName: string; subjectName: string } | null>(
    null,
  );
  const [stage, setStage] = useState<{ width: number; height: number } | null>(null);
  const [agoraRtc, setAgoraRtc] = useState<AgoraRtcRuntime | null>(null);
  const engineRef = useRef<IRtcEngine | null>(null);
  const rtmRef = useRef<IRtmClient | null>(null);
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
      // #region agent log
      debugOnlineClassLog('H5', 'OnlineClassScreen:refreshLocalPreview', 'skipped startPreview (in channel)', {
        platform: Platform.OS,
      });
      // #endregion
      return;
    }
    let previewResult: number | undefined;
    let previewPath = 'startPreview';
    try {
      const legacy = engine as IRtcEngine & { startPreviewWithoutSourceType?: () => number };
      if (
        Platform.OS === 'android' &&
        typeof legacy.startPreviewWithoutSourceType === 'function'
      ) {
        previewPath = 'startPreviewWithoutSourceType';
        previewResult = legacy.startPreviewWithoutSourceType();
      } else {
        previewResult = engine.startPreview();
      }
    } catch (caught) {
      // #region agent log
      debugOnlineClassLog('H5', 'OnlineClassScreen:refreshLocalPreview', 'startPreview threw', {
        platform: Platform.OS,
        message: caught instanceof Error ? caught.message : String(caught),
      });
      // #endregion
      return;
    }
    // #region agent log
    debugOnlineClassLog('H5', 'OnlineClassScreen:refreshLocalPreview', 'startPreview result', {
      platform: Platform.OS,
      previewPath,
      previewResult,
      joinedChannel: joinedChannelRef.current,
    });
    // #endregion
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
        await ensureOnlineClassCallPermissions();
        const { data } = await joinOnlineClass({ variables: { sessionId } });
        const creds = data?.joinOnlineClass as JoinPayload | undefined;
        // #region agent log
        debugOnlineClassLog('H1', 'OnlineClassScreen:join', 'joinOnlineClass response', {
          hasCreds: Boolean(creds),
          sessionId,
          participantCount: creds?.participants?.length ?? 0,
          participantUserIds: (creds?.participants ?? []).map((p) => p.userId),
          localUid: creds?.uid ?? null,
          channelName: creds?.channelName ?? null,
          hasAppId: Boolean(creds?.appId),
        });
        // #endregion
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
        // #region agent log
        debugOnlineClassLog('H4', 'OnlineClassScreen:join', 'roster seeded from join payload', {
          rosterRemoteUids,
        });
        // #endregion
        // #region agent log
        debugOnlineClassLog('H3', 'OnlineClassScreen:agora', 'native module before load', {
          rtcNativeAvailable: isAgoraRtcNativeAvailable(),
          platform: Platform.OS,
        });
        // #endregion
        const rtc = loadAgoraRtcModule();
        agoraRtcRef.current = rtc;
        if (!cancelled) {
          setAgoraRtc(rtc);
        }
        // #region agent log
        debugOnlineClassLog('H3', 'OnlineClassScreen:agora', 'rtc module loaded', {
          hasTextureView: Boolean(rtc.RtcTextureView),
          hasSurfaceView: Boolean(rtc.RtcSurfaceView),
          hasVideoSourceType: Boolean(rtc.VideoSourceType),
          hasRenderModeType: Boolean(rtc.RenderModeType),
        });
        // #endregion
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
          // #region agent log
          debugOnlineClassLog('H2', 'OnlineClassScreen:rtm', 'rtm connected after rtc join', {
            channelName: creds.channelName,
          });
          // #endregion
        };
        const completeRtcJoin = (source: string, elapsed?: number) => {
          if (rtcPublishStartedRef.current) {
            return;
          }
          rtcPublishStartedRef.current = true;
          joinedChannelRef.current = true;
          // #region agent log
          debugOnlineClassLog('H2', 'OnlineClassScreen:agora', 'rtc join complete', {
            source,
            elapsed,
            localUid: localUidRef.current,
            rosterRemoteUids,
          });
          // #endregion
          publishCameraToChannel();
          if (!rtmStartedRef.current) {
            rtmStartedRef.current = true;
            void connectClassChat().catch((rtmError: unknown) => {
              // #region agent log
              debugOnlineClassLog('H2', 'OnlineClassScreen:rtm', 'rtm connect failed', {
                message: rtmError instanceof Error ? rtmError.message : String(rtmError),
              });
              // #endregion
            });
          }
        };
        const agoraHandler: IRtcEngineEventHandler = {
          onError(err, msg) {
            // #region agent log
            debugOnlineClassLog('H2', 'OnlineClassScreen:agora', 'onError', { err, msg });
            // #endregion
          },
          onUserJoined(_connection, uid) {
            // #region agent log
            debugOnlineClassLog('H4', 'OnlineClassScreen:agora', 'onUserJoined', {
              rawUid: uid,
              normalized: normalizeAgoraUid(uid),
              localUid: localUidRef.current,
            });
            // #endregion
            rememberRemote(uid);
          },
          onUserOffline(_connection, uid) {
            const normalized = normalizeAgoraUid(uid);
            if (normalized == null) {
              return;
            }
            setRemoteUids((current) => current.filter((item) => item !== normalized));
          },
          onRemoteVideoStateChanged(_connection, uid, state) {
            if (
              state === rtc.RemoteVideoState.RemoteVideoStateStarting ||
              state === rtc.RemoteVideoState.RemoteVideoStateDecoding
            ) {
              rememberRemote(uid);
              bumpRemoteVideo(uid);
            }
          },
          onFirstRemoteVideoFrame(_connection, uid) {
            rememberRemote(uid);
            bumpRemoteVideo(uid);
          },
          onConnectionStateChanged(_connection, state, reason) {
            // #region agent log
            debugOnlineClassLog('H2', 'OnlineClassScreen:agora', 'onConnectionStateChanged', {
              state,
              reason,
            });
            // #endregion
            if (state === rtc.ConnectionStateType.ConnectionStateConnected) {
              completeRtcJoin('onConnectionStateChanged');
            }
            if (reason === rtc.ConnectionChangedReasonType.ConnectionChangedBannedByServer) {
              finish();
            }
          },
          onJoinChannelSuccess(_connection, elapsed) {
            completeRtcJoin('onJoinChannelSuccess', elapsed);
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
        // #region agent log
        debugOnlineClassLog('H2', 'OnlineClassScreen:agora', 'joinChannel called', {
          joinResultCode: joinResult ?? null,
          joinResultType: typeof joinResult,
          joinOk: joinResult === 0,
          localUid: localUidRef.current,
        });
        // #endregion
        if (typeof joinResult === 'number' && joinResult !== 0) {
          setError(`Could not join video (code ${joinResult}). Leave and try again.`);
        } else if (joinResult === 0 || joinResult === undefined) {
          completeRtcJoin(
            joinResult === 0 ? 'sync-join-return-0' : 'sync-join-return-undefined',
          );
        }
      } catch (caught) {
        // #region agent log
        debugOnlineClassLog('H1', 'OnlineClassScreen:join', 'join flow threw', {
          message: caught instanceof Error ? caught.message : String(caught),
        });
        // #endregion
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unable to join this class');
        }
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
    const RtcVideoView = pickRtcVideoView(agoraRtc);
    // #region agent log
    debugOnlineClassLog('H3', 'OnlineClassScreen:render', 'video strip state', {
      hasAgoraRtc: Boolean(agoraRtc),
      hasRtcVideoView: Boolean(RtcVideoView),
      hasRenderModeType: Boolean(agoraRtc?.RenderModeType),
      hasVideoSourceType: Boolean(agoraRtc?.VideoSourceType),
      remoteUidCount: remoteUids.length,
      remoteUids,
      joinedChannel: joinedChannelRef.current,
      error,
      platform: Platform.OS,
      videoViewKind: 'RtcSurfaceView',
    });
    // #endregion
  }, [agoraRtc, remoteUids, error]);

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
    const rtc = agoraRtcRef.current;
    if (!rtc) {
      return;
    }
    const options = new rtc.ChannelMediaOptions();
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
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
  const webViewReady = isWebViewNativeAvailable();
  const VideoSourceType = agoraRtc?.VideoSourceType;
  const RenderModeType = agoraRtc?.RenderModeType;
  const RtcVideoView = pickRtcVideoView(agoraRtc);

  const onLocalPreviewLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width < 2 || height < 2) {
      return;
    }
    if (joinedChannelRef.current) {
      publishCameraToChannel();
    } else {
      refreshLocalPreview();
    }
  };

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
      <View testID="whiteboard-board" style={styles.board} onLayout={onBoardLayout}>
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
      {sharing && RtcVideoView && VideoSourceType ? (
        <View collapsable={false} style={styles.screenFrame}>
          <RtcVideoView
            style={styles.rtcSurface}
            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceScreen }}
          />
        </View>
      ) : null}
      {remoteSharingUid != null && RtcVideoView ? (
        <View collapsable={false} style={styles.screenFrame}>
          <RtcVideoView style={styles.rtcSurface} canvas={{ uid: remoteSharingUid }} />
        </View>
      ) : null}
      <ScrollView horizontal style={styles.videos} contentContainerStyle={styles.videoRow}>
        {agoraRtc && RtcVideoView && RenderModeType && VideoSourceType ? (
          <View collapsable={false} style={styles.videoItem}>
            <View collapsable={false} style={styles.tileFrame} onLayout={onLocalPreviewLayout}>
              <RtcVideoView
                zOrderMediaOverlay={Platform.OS === 'android'}
                style={styles.rtcSurface}
                canvas={{
                  uid: 0,
                  sourceType: VideoSourceType.VideoSourceCamera,
                  renderMode: RenderModeType.RenderModeFit,
                }}
              />
            </View>
            <Text style={styles.initials} accessibilityLabel="You">
              You
            </Text>
          </View>
        ) : null}
        {remoteUids.map((uid) => {
          const name = rosterName(board?.participants, uid, '');
          const videoKey = remoteVideoGeneration[uid] ?? 0;
          return (
            <View key={`${uid}-${videoKey}`} collapsable={false} style={styles.videoItem}>
              {RtcVideoView && RenderModeType ? (
                <View collapsable={false} style={styles.tileFrame}>
                  <RtcVideoView
                    zOrderMediaOverlay={Platform.OS === 'android'}
                    style={styles.rtcSurface}
                    canvas={{ uid, renderMode: RenderModeType.RenderModeFit }}
                  />
                </View>
              ) : null}
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
  board: {
    flex: 1,
    minHeight: 280,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
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
