import type { IRtcEngine, IRtcEngineEventHandler } from 'react-native-agora';

import { loadAgoraRtcModule } from './agora-native';

type AgoraRtcModule = ReturnType<typeof loadAgoraRtcModule>;

let activeAgoraAppId: string | null = null;
let globalHandlerRegistered = false;
let rtcEventDelegate: IRtcEngineEventHandler | null = null;

const globalRtcEventHandler: IRtcEngineEventHandler = {
  onError(err, msg) {
    rtcEventDelegate?.onError?.(err, msg);
  },
  onJoinChannelSuccess(connection, elapsed) {
    rtcEventDelegate?.onJoinChannelSuccess?.(connection, elapsed);
  },
  onUserJoined(connection, uid, elapsed) {
    rtcEventDelegate?.onUserJoined?.(connection, uid, elapsed);
  },
  onUserOffline(connection, uid, reason) {
    rtcEventDelegate?.onUserOffline?.(connection, uid, reason);
  },
  onRemoteVideoStateChanged(connection, uid, state, reason, elapsed) {
    rtcEventDelegate?.onRemoteVideoStateChanged?.(
      connection,
      uid,
      state,
      reason,
      elapsed,
    );
  },
  onFirstRemoteVideoFrame(connection, uid, width, height, elapsed) {
    rtcEventDelegate?.onFirstRemoteVideoFrame?.(connection, uid, width, height, elapsed);
  },
  onConnectionStateChanged(connection, state, reason) {
    rtcEventDelegate?.onConnectionStateChanged?.(connection, state, reason);
  },
};

/** Route native Agora events to the active class screen without re-registering on each render. */
export function bindRtcEventDelegate(
  engine: IRtcEngine,
  delegate: IRtcEngineEventHandler | null,
): void {
  rtcEventDelegate = delegate;
  if (!globalHandlerRegistered) {
    engine.registerEventHandler(globalRtcEventHandler);
    globalHandlerRegistered = true;
  }
}

export function ensureAgoraRtcEngine(
  rtc: AgoraRtcModule,
  appId: string,
): { engine: IRtcEngine; initCode: number } {
  const engine = rtc.createAgoraRtcEngine();
  const channelProfile = rtc.ChannelProfileType.ChannelProfileCommunication;

  if (activeAgoraAppId === appId) {
    try {
      engine.leaveChannel();
    } catch {
      // Not in a channel.
    }
    return { engine, initCode: 0 };
  }

  if (activeAgoraAppId) {
    try {
      engine.leaveChannel();
      engine.release(true);
    } catch {
      // Stale singleton.
    }
    globalHandlerRegistered = false;
    rtcEventDelegate = null;
  }

  const raw = engine.initialize({ appId, channelProfile });
  activeAgoraAppId = appId;
  const initCode = typeof raw === 'number' ? raw : 0;
  return { engine, initCode };
}

export function leaveAgoraRtcChannel(engine: IRtcEngine | null): void {
  if (!engine) {
    return;
  }
  try {
    engine.leaveChannel();
  } catch {
    // Channel may already be left.
  }
}

export function releaseAgoraRtcEngine(engine: IRtcEngine | null): void {
  if (!engine) {
    return;
  }
  rtcEventDelegate = null;
  try {
    engine.leaveChannel();
    engine.release(true);
  } catch {
    // Ignore teardown races on the singleton.
  }
  activeAgoraAppId = null;
  globalHandlerRegistered = false;
}
