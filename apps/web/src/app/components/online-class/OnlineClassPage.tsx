import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  ILocalVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraRTM, { type RTMClient } from 'agora-rtm-sdk';
import { createFastboard, mount } from '@netless/fastboard';
import { END_ONLINE_CLASS, JOIN_ONLINE_CLASS } from '@tutorix/shared-graphql';
import {
  isOnlineClassEndedMessage,
  ONLINE_CLASS_WRAP_UP_MESSAGE,
  onlineClassEndedPayload,
} from '@tutorix/shared-utils';

type JoinPayload = {
  appId: string;
  channelName: string;
  token: string;
  rtmToken: string;
  uid: number;
  expiresAt: string;
  warnAt: string;
  scheduledEnd: string;
  whiteboardAppIdentifier?: string | null;
  whiteboardRegion?: string | null;
  whiteboardRoomUuid?: string | null;
  whiteboardRoomToken?: string | null;
  whiteboardError?: string | null;
};

type ChatLine = {
  id: string;
  from: string;
  text: string;
  mine: boolean;
};

export type OnlineClassPageProps = {
  sessionId: string;
  displayName: string;
  canEndClass?: boolean;
  onLeave: () => void;
};

export const OnlineClassPage: React.FC<OnlineClassPageProps> = ({
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
  const [chatOpen, setChatOpen] = useState(true);
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState('');
  const [sharing, setSharing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [whiteboardNote, setWhiteboardNote] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const remotesRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const rtmRef = useRef<RTMClient | null>(null);
  const channelRef = useRef('');
  const uidRef = useRef('');
  const nameRef = useRef(displayName);
  const finishRef = useRef<() => void>(() => undefined);
  nameRef.current = displayName;

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    let boardDestroy: (() => void) | null = null;

    const leaveMedia = async () => {
      screenTrackRef.current?.close();
      camRef.current?.close();
      micRef.current?.close();
      screenTrackRef.current = null;
      camRef.current = null;
      micRef.current = null;
      await clientRef.current?.leave().catch(() => undefined);
      clientRef.current = null;
      await rtmRef.current?.logout().catch(() => undefined);
      rtmRef.current = null;
      boardDestroy?.();
      boardDestroy = null;
    };

    const finish = () => {
      if (cancelled) {
        return;
      }
      setEnded(true);
      void leaveMedia();
    };
    finishRef.current = finish;

    void (async () => {
      try {
        const { data } = await joinOnlineClass({ variables: { sessionId } });
        const creds = data?.joinOnlineClass as JoinPayload | undefined;
        if (cancelled || !creds) {
          return;
        }
        if (creds.whiteboardError) {
          setWhiteboardNote(creds.whiteboardError);
        }
        const warnIn = new Date(creds.warnAt).getTime() - Date.now();
        const endIn = new Date(creds.expiresAt).getTime() - Date.now();
        if (warnIn <= 0) {
          setWrapUp(true);
        } else {
          timers.push(window.setTimeout(() => setWrapUp(true), warnIn));
        }
        timers.push(window.setTimeout(finish, Math.max(0, endIn)));
        if (endIn <= 0) {
          finish();
          return;
        }

        channelRef.current = creds.channelName;
        uidRef.current = String(creds.uid);
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;
        client.on('connection-state-change', (_current, _previous, reason) => {
          if (reason === 'UID_BANNED') {
            finish();
          }
        });
        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video' && remotesRef.current && user.videoTrack) {
            const tile = document.createElement('div');
            tile.dataset.uid = String(user.uid);
            tile.className = 'h-28 overflow-hidden rounded-xl bg-slate-900';
            remotesRef.current.appendChild(tile);
            user.videoTrack.play(tile);
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        });
        client.on('user-unpublished', (user) => {
          remotesRef.current?.querySelector(`[data-uid="${user.uid}"]`)?.remove();
        });
        await client.join(creds.appId, creds.channelName, creds.token, creds.uid);
        const [mic, cam] = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (cancelled) {
          mic.close();
          cam.close();
          return;
        }
        micRef.current = mic;
        camRef.current = cam;
        if (localVideoRef.current) {
          cam.play(localVideoRef.current);
        }
        await client.publish([mic, cam]);

        const rtm = new AgoraRTM.RTM(creds.appId, String(creds.uid));
        rtmRef.current = rtm;
        const onMessage = (event: { message: string | Uint8Array; publisher: string }) => {
          const raw = typeof event.message === 'string' ? event.message : '';
          if (isOnlineClassEndedMessage(raw)) {
            finish();
            return;
          }
          let text = raw;
          let from = event.publisher;
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
          setChatLines((lines) => [
            ...lines,
            {
              id: `${event.publisher}-${lines.length}`,
              from,
              text,
              mine: event.publisher === uidRef.current,
            },
          ]);
        };
        rtm.addEventListener('message', onMessage);
        await rtm.login({ token: creds.rtmToken });
        await rtm.subscribe(creds.channelName);

        if (
          creds.whiteboardAppIdentifier &&
          creds.whiteboardRoomUuid &&
          creds.whiteboardRoomToken &&
          boardRef.current
        ) {
          const app = await createFastboard({
            sdkConfig: {
              appIdentifier: creds.whiteboardAppIdentifier,
              region: (creds.whiteboardRegion || 'us-sv') as 'us-sv',
            },
            joinRoom: {
              uid: String(creds.uid),
              uuid: creds.whiteboardRoomUuid,
              roomToken: creds.whiteboardRoomToken,
            },
          });
          const ui = mount(app, boardRef.current);
          boardDestroy = () => {
            ui.destroy();
            void app.destroy();
          };
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unable to join this class');
        }
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      void leaveMedia();
    };
  }, [joinOnlineClass, sessionId]);

  const sendChat = async () => {
    const text = draft.trim();
    const rtm = rtmRef.current;
    if (!text || !rtm || !channelRef.current) {
      return;
    }
    setDraft('');
    await rtm.publish(
      channelRef.current,
      JSON.stringify({ text, name: nameRef.current }),
    );
    setChatLines((lines) => [
      ...lines,
      { id: `me-${lines.length}`, from: nameRef.current, text, mine: true },
    ]);
  };

  const toggleMic = async () => {
    const mic = micRef.current;
    if (!mic) {
      return;
    }
    await mic.setEnabled(!mic.enabled);
  };

  const toggleCamera = async () => {
    const cam = camRef.current;
    if (!cam) {
      return;
    }
    await cam.setEnabled(!cam.enabled);
  };

  const toggleScreen = async () => {
    const client = clientRef.current;
    if (!client) {
      return;
    }
    if (screenTrackRef.current) {
      await client.unpublish(screenTrackRef.current);
      screenTrackRef.current.close();
      screenTrackRef.current = null;
      setSharing(false);
      if (camRef.current) {
        await client.publish(camRef.current);
        if (localVideoRef.current) {
          camRef.current.play(localVideoRef.current);
        }
      }
      return;
    }
    const created = await AgoraRTC.createScreenVideoTrack({ optimizationMode: 'detail' });
    const track = Array.isArray(created) ? created[0] : created;
    if (camRef.current) {
      await client.unpublish(camRef.current);
    }
    screenTrackRef.current = track;
    await client.publish(track);
    if (screenRef.current) {
      track.play(screenRef.current);
    }
    track.on('track-ended', () => {
      void toggleScreen();
    });
    setSharing(true);
  };

  const leave = () => {
    setEnded(true);
    onLeave();
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

  if (ended) {
    return (
      <div className="mx-auto max-w-lg rounded-[20px] bg-white p-8 text-center">
        <p className="text-lg font-extrabold text-[#143055]">This class has ended</p>
        <button
          type="button"
          onClick={onLeave}
          className="mt-4 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
      {wrapUp ? (
        <div
          role="dialog"
          aria-label="Wrap up"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"
        >
          {ONLINE_CLASS_WRAP_UP_MESSAGE}
          <button type="button" className="ml-3 underline" onClick={() => setWrapUp(false)}>
            OK
          </button>
        </div>
      ) : null}
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      {whiteboardNote ? (
        <p className="text-sm font-semibold text-amber-800">{whiteboardNote}</p>
      ) : null}
      <div className="flex min-h-[520px] gap-3">
        <div className="relative min-w-0 flex-1">
          <div ref={boardRef} className="h-full min-h-[520px] rounded-[20px] bg-white" />
          <div
            ref={screenRef}
            className={`absolute bottom-4 right-4 h-36 w-64 overflow-hidden rounded-xl bg-slate-900 ${
              sharing ? '' : 'hidden'
            }`}
          />
        </div>
        <aside className="flex w-72 shrink-0 flex-col gap-3">
          <div ref={localVideoRef} className="h-28 overflow-hidden rounded-xl bg-slate-900" />
          <div ref={remotesRef} className="flex flex-col gap-2" />
          {chatOpen ? (
            <div className="flex min-h-0 flex-1 flex-col rounded-[20px] bg-white p-3">
              <p className="text-sm font-extrabold text-[#143055]">Chat</p>
              <ul className="mt-2 flex-1 space-y-2 overflow-y-auto text-sm">
                {chatLines.map((line) => (
                  <li key={line.id}>
                    <span className="font-semibold text-[#143055]">{line.from}: </span>
                    {line.text}
                  </li>
                ))}
              </ul>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendChat();
                }}
              >
                <input
                  aria-label="Message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
                <button type="submit" className="text-sm font-semibold text-[#2563eb]">
                  Send
                </button>
              </form>
            </div>
          ) : null}
        </aside>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void toggleMic()} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#143055]">
          Mute mic
        </button>
        <button type="button" onClick={() => void toggleCamera()} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#143055]">
          Mute camera
        </button>
        <button type="button" onClick={() => void toggleScreen()} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#143055]">
          {sharing ? 'Stop sharing' : 'Share screen'}
        </button>
        <button type="button" onClick={() => setChatOpen((open) => !open)} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#143055]">
          {chatOpen ? 'Hide chat' : 'Open chat'}
        </button>
        {canEndClass ? (
          <button
            type="button"
            onClick={() => void endClass()}
            disabled={ending}
            className="rounded-xl bg-[#b91c1c] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            End class
          </button>
        ) : null}
        <button type="button" onClick={leave} className="rounded-xl bg-[#143055] px-3 py-2 text-sm font-semibold text-white">
          Leave
        </button>
      </div>
    </div>
  );
};
