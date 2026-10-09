import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  ILocalVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraRTM, { type RTMClient } from 'agora-rtm-sdk';
import { createFastboard, mount } from '@netless/fastboard';
import { END_ONLINE_CLASS, JOIN_ONLINE_CLASS } from '@tutorix/shared-graphql';
import {
  isOnlineClassEndedMessage,
  nameInitials,
  ONLINE_CLASS_WHITEBOARD_HEIGHT_RATIO,
  ONLINE_CLASS_WRAP_UP_MESSAGE,
  onlineClassEndedPayload,
  onlineClassScreenSharePayload,
  onlineClassScreenShareState,
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
  whiteboardWritable?: boolean;
  tutorName?: string | null;
  subjectName?: string | null;
  participants?: { userId: number; name: string }[];
};

type ChatLine = {
  id: string;
  from: string;
  text: string;
  mine: boolean;
};

type ClassChatMessage = { message: string | Uint8Array; publisher: string };

type ClassChat = {
  key: string;
  client: RTMClient;
  onMessage?: (event: ClassChatMessage) => void;
};

/**
 * The Signaling SDK records each appId+userId in a process-wide set and never
 * removes it. A second `new RTM(...)` for that id throws -10027 even when the
 * student is logged out. Keep one client and log in again on it.
 */
let classChat: ClassChat | null = null;
let classChatQueue: Promise<void> = Promise.resolve();

function enqueueClassChat(task: () => Promise<void>): Promise<void> {
  const run = classChatQueue.then(task, task);
  classChatQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

type MountedFastboard = {
  ui: { destroy: () => void };
  app: { destroy: () => Promise<unknown> };
};

/** WindowManager allows one live board. A rejoin must destroy the previous one first. */
let mountedFastboard: MountedFastboard | null = null;
let fastboardQueue: Promise<void> = Promise.resolve();

function enqueueFastboard(task: () => Promise<void>): Promise<void> {
  const run = fastboardQueue.then(task, task);
  fastboardQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function destroyMountedFastboard(): Promise<void> {
  const mounted = mountedFastboard;
  mountedFastboard = null;
  if (!mounted) {
    return;
  }
  try {
    mounted.ui.destroy();
  } catch {
    // The board node is already gone when the page unmounts.
  }
  await mounted.app.destroy().catch(() => undefined);
}

export function resetOnlineClassChatForTests(): void {
  classChat = null;
  classChatQueue = Promise.resolve();
  mountedFastboard = null;
  fastboardQueue = Promise.resolve();
}

async function connectClassChat(appId: string, userId: string, token: string): Promise<RTMClient> {
  try {
    AgoraRTM.setParameter('IGNORE_DUPLICATE_USER_ID_ERR', true);
  } catch {
    // Reusing the existing client still avoids the duplicate-id check.
  }
  const key = `${appId}:${userId}`;
  if (classChat && classChat.key !== key) {
    await classChat.client.logout().catch(() => undefined);
    classChat = null;
  }
  const client = classChat?.client ?? new AgoraRTM.RTM(appId, userId);
  classChat = { key, client };
  await client.logout().catch(() => undefined);
  await client.login({ token });
  return client;
}

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
  const [remoteSharingUid, setRemoteSharingUid] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [ending, setEnding] = useState(false);
  const [whiteboardNote, setWhiteboardNote] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState<{ tutorName: string; subjectName: string } | null>(
    null,
  );
  const boardRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const remotesRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const remoteVideosRef = useRef<Map<string, IRemoteVideoTrack>>(new Map());
  const remoteSharingRef = useRef<string | null>(null);
  const remoteScreenRef = useRef<HTMLDivElement>(null);
  const rtmRef = useRef<RTMClient | null>(null);
  const channelRef = useRef('');
  const uidRef = useRef('');
  const nameRef = useRef(displayName);
  const namesRef = useRef<Map<number, string>>(new Map());
  const canDrawRef = useRef(canEndClass);
  const finishRef = useRef<() => void>(() => undefined);
  nameRef.current = displayName;
  canDrawRef.current = canEndClass;

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];

    const leaveMedia = async () => {
      const releaseBoard = enqueueFastboard(() => destroyMountedFastboard());
      screenTrackRef.current?.close();
      camRef.current?.close();
      micRef.current?.close();
      screenTrackRef.current = null;
      camRef.current = null;
      micRef.current = null;
      await clientRef.current?.leave().catch(() => undefined);
      clientRef.current = null;
      const rtm = rtmRef.current;
      rtmRef.current = null;
      if (rtm) {
        await enqueueClassChat(async () => {
          if (classChat?.client === rtm && classChat.onMessage) {
            rtm.removeEventListener('message', classChat.onMessage);
            classChat.onMessage = undefined;
          }
          await rtm.logout().catch(() => undefined);
        });
      }
      await releaseBoard;
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
        const roster = new Map(
          (creds.participants ?? []).map((member) => [member.userId, member.name]),
        );
        namesRef.current = roster;
        setClassTitle({
          tutorName: creds.tutorName?.trim() || 'Tutor',
          subjectName: creds.subjectName?.trim() || 'Class',
        });
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
        const placeRemoteVideo = (uid: string) => {
          const track = remoteVideosRef.current.get(uid);
          if (!track) {
            return;
          }
          if (remoteSharingRef.current === uid && remoteScreenRef.current) {
            track.play(remoteScreenRef.current);
            return;
          }
          const tile = remotesRef.current?.querySelector(
            `[data-uid="${uid}"] [data-video]`,
          ) as HTMLElement | null;
          if (tile) {
            track.play(tile, { fit: 'contain' });
          }
        };
        const onPublished = async (
          user: { uid: number | string; videoTrack?: IRemoteVideoTrack; audioTrack?: { play: () => void }; hasVideo?: boolean; hasAudio?: boolean },
          mediaType: 'audio' | 'video',
        ) => {
          await client.subscribe(user as never, mediaType);
          if (mediaType === 'video' && remotesRef.current && user.videoTrack) {
            const uid = String(user.uid);
            remoteVideosRef.current.set(uid, user.videoTrack);
            remotesRef.current.querySelector(`[data-uid="${uid}"]`)?.remove();
            const name = namesRef.current.get(Number(user.uid)) ?? '';
            const wrap = document.createElement('div');
            wrap.dataset.uid = uid;
            wrap.className = 'flex flex-col';
            const tile = document.createElement('div');
            tile.dataset.video = 'true';
            tile.className = 'relative mx-auto h-44 w-32 overflow-hidden rounded-xl bg-slate-900';
            wrap.append(tile);
            const initials = nameInitials(name);
            if (initials) {
              const label = document.createElement('p');
              label.className = 'mt-1 text-center text-xs font-bold tracking-wide text-[#143055]';
              label.textContent = initials;
              label.setAttribute('aria-label', name);
              wrap.append(label);
            }
            remotesRef.current.appendChild(wrap);
            placeRemoteVideo(uid);
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        };
        client.on('user-published', (user, mediaType) => {
          if (mediaType === 'datachannel') {
            return;
          }
          void onPublished(user, mediaType);
        });
        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType !== 'video') {
            return;
          }
          remoteVideosRef.current.delete(String(user.uid));
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
        await client.publish([mic, cam]);
        for (const user of client.remoteUsers ?? []) {
          if (cancelled) {
            return;
          }
          if (user.hasVideo) {
            await onPublished(user, 'video');
          }
          if (user.hasAudio) {
            await onPublished(user, 'audio');
          }
        }

        const onMessage = (event: { message: string | Uint8Array; publisher: string }) => {
          const raw = typeof event.message === 'string' ? event.message : '';
          if (isOnlineClassEndedMessage(raw)) {
            finish();
            return;
          }
          const sharingState = onlineClassScreenShareState(raw);
          if (sharingState != null) {
            const uid = sharingState ? event.publisher : null;
            remoteSharingRef.current = uid;
            setRemoteSharingUid(uid);
            if (uid) {
              window.requestAnimationFrame(() => placeRemoteVideo(uid));
            } else if (event.publisher) {
              placeRemoteVideo(event.publisher);
            }
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
        await enqueueClassChat(async () => {
          if (cancelled) {
            return;
          }
          const rtm = await connectClassChat(creds.appId, String(creds.uid), creds.rtmToken);
          if (cancelled) {
            await rtm.logout().catch(() => undefined);
            return;
          }
          rtmRef.current = rtm;
          if (classChat?.onMessage) {
            rtm.removeEventListener('message', classChat.onMessage);
          }
          rtm.addEventListener('message', onMessage);
          if (classChat) {
            classChat.onMessage = onMessage;
          }
          await rtm.subscribe(creds.channelName);
        });

        if (
          creds.whiteboardAppIdentifier &&
          creds.whiteboardRoomUuid &&
          creds.whiteboardRoomToken &&
          boardRef.current
        ) {
          await enqueueFastboard(async () => {
            if (
              cancelled ||
              !boardRef.current ||
              !creds.whiteboardAppIdentifier ||
              !creds.whiteboardRoomUuid ||
              !creds.whiteboardRoomToken
            ) {
              return;
            }
            await destroyMountedFastboard();
            if (cancelled || !boardRef.current) {
              return;
            }
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
              managerConfig: {
                containerSizeRatio: ONLINE_CLASS_WHITEBOARD_HEIGHT_RATIO,
                chessboard: false,
              },
            });
            if (cancelled || !boardRef.current) {
              await app.destroy().catch(() => undefined);
              return;
            }
            const tutorDraws = canDrawRef.current || creds.whiteboardWritable === true;
            try {
              if (tutorDraws) {
                if (!app.room.isWritable) {
                  await app.room.setWritable(true);
                }
              } else {
                await app.room.setWritable(false);
                app.room.disableDeviceInputs = true;
              }
            } catch (lockError) {
              setWhiteboardNote(
                lockError instanceof Error ? lockError.message : 'Whiteboard tools could not be updated',
              );
            }
            if (cancelled || !boardRef.current) {
              await app.destroy().catch(() => undefined);
              return;
            }
            const ui = mount(app, boardRef.current, {
              force_show_toolbar: tutorDraws,
            });
            mountedFastboard = { ui, app };
          });
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

  useEffect(() => {
    const track = screenTrackRef.current;
    if (sharing && track && screenRef.current) {
      track.play(screenRef.current);
    }
  }, [sharing]);

  useEffect(() => {
    if (!remoteSharingUid) {
      return;
    }
    const track = remoteVideosRef.current.get(remoteSharingUid);
    if (track && remoteScreenRef.current) {
      track.play(remoteScreenRef.current);
    }
  }, [remoteSharingUid]);

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

  const publishScreenState = async (active: boolean) => {
    const rtm = rtmRef.current;
    if (!rtm || !channelRef.current) {
      return;
    }
    try {
      await rtm.publish(channelRef.current, onlineClassScreenSharePayload(active));
    } catch {
      // The video track still switches even if the stage signal is missed.
    }
  };

  const toggleMic = async () => {
    const mic = micRef.current;
    if (!mic) {
      return;
    }
    const next = !micOn;
    try {
      await mic.setMuted(!next);
      setMicOn(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to change the microphone');
    }
  };

  const toggleCamera = async () => {
    const cam = camRef.current;
    if (!cam) {
      return;
    }
    const next = !camOn;
    try {
      await cam.setMuted(!next);
      setCamOn(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to change the camera');
    }
  };

  const toggleScreen = async () => {
    const client = clientRef.current;
    if (!client) {
      return;
    }
    try {
      if (screenTrackRef.current) {
        await client.unpublish(screenTrackRef.current);
        screenTrackRef.current.close();
        screenTrackRef.current = null;
        setSharing(false);
        await publishScreenState(false);
        if (camRef.current) {
          await client.publish(camRef.current);
        }
        return;
      }
      const created = await AgoraRTC.createScreenVideoTrack({ optimizationMode: 'detail' }, 'disable');
      const track = Array.isArray(created) ? created[0] : created;
      if (camRef.current) {
        await client.unpublish(camRef.current);
      }
      screenTrackRef.current = track;
      await client.publish(track);
      setSharing(true);
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
      if (screenRef.current) {
        track.play(screenRef.current);
      }
      track.on('track-ended', () => {
        void toggleScreen();
      });
      await publishScreenState(true);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      if (/cancel|notallowed|permission/i.test(message)) {
        return;
      }
      setError(message || 'Unable to share the screen');
    }
  };

  const leave = () => {
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
      {classTitle ? (
        <header>
          <h1 className="text-lg font-extrabold text-[#143055]">{classTitle.tutorName}</h1>
          <p className="text-sm font-semibold text-slate-600">{classTitle.subjectName}</p>
        </header>
      ) : null}
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
          <div ref={boardRef} className="h-full min-h-[520px] overflow-hidden rounded-[20px] bg-white" />
        </div>
        <aside className="flex w-72 shrink-0 flex-col gap-3">
          {sharing ? (
            <div ref={screenRef} className="relative h-40 overflow-hidden rounded-xl bg-slate-900" />
          ) : null}
          {remoteSharingUid ? (
            <div ref={remoteScreenRef} className="relative h-40 overflow-hidden rounded-xl bg-slate-900" />
          ) : null}
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
          {micOn ? 'Mute mic' : 'Unmute mic'}
        </button>
        <button type="button" onClick={() => void toggleCamera()} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#143055]">
          {camOn ? 'Mute camera' : 'Unmute camera'}
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
