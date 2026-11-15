import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Brew, Settings, SoundKey, Timer, TimerStatus } from './types';
import { cancelNotification, scheduleDone } from './notifications';
import { effectiveSound, VIBE_PATTERNS } from './sounds';
import { uid } from './utils';

export interface TimersApi {
  timers: Timer[];
  get: (id: string) => Timer | undefined;
  forBrew: (brewId: string) => Timer | undefined;
  /** Сколько секунд осталось сейчас. */
  left: (t: Timer) => number;
  /** Вернуть таймер сорта; если его нет — создать (в состоянии «готов к запуску»). */
  ensure: (brewId: string) => string | null;
  start: (id: string) => Promise<void>;
  pause: (id: string) => Promise<void>;
  reset: (id: string) => Promise<void>;
  goStep: (id: string, i: number) => Promise<void>;
  adjust: (id: string, deltaSec: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setSound: (id: string, sound: SoundKey | undefined) => Promise<void>;
  /** Запустить сразу несколько сортов. */
  startMany: (brewIds: string[]) => Promise<string[]>;
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  /** Убрать таймеры, которые открыли, но так и не запустили. */
  prune: () => void;
}

const Ctx = createContext<TimersApi | null>(null);

export function useTimers(): TimersApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('TimersProvider is missing');
  return v;
}

export const statusText = (s: TimerStatus, last: boolean, isTea: boolean) =>
  s === 'done'
    ? last ? (isTea ? 'Чай готов 🍵' : 'Кофе готов ☕') : 'Сливайте!'
    : s === 'paused' ? 'пауза'
    : s === 'running' ? 'идёт заваривание'
    : 'готов к запуску';

export function TimersProvider({ brews, settings, children }: { brews: Brew[]; settings: Settings; children: React.ReactNode }) {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [, setTick] = useState(0);
  // ref всегда хранит самое свежее состояние — асинхронные функции читают его, а не устаревшие замыкания.
  const ref = useRef<Timer[]>([]);
  const brewsRef = useRef(brews);
  const settingsRef = useRef(settings);
  brewsRef.current = brews;
  settingsRef.current = settings;

  const commit = (next: Timer[]) => {
    ref.current = next;
    setTimers(next);
  };
  const patch = (id: string, p: Partial<Timer>) => commit(ref.current.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const get = (id: string) => ref.current.find((t) => t.id === id);
  const brewOf = (t: Timer) => brewsRef.current.find((b) => b.id === t.brewId);
  const left = (t: Timer) => (t.status === 'running' ? Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000)) : t.remaining);

  /** Запланировать системное уведомление об окончании текущего пролива. */
  const schedule = (t: Timer, seconds: number): Promise<string | null> => {
    const b = brewOf(t);
    const s = settingsRef.current;
    if (!b || !s.notifications) return Promise.resolve(null);
    const unit = b.kind === 'tea' ? 'Пролив' : 'Этап';
    return scheduleDone(
      seconds,
      `${b.name}: готово`,
      `${unit} ${t.idx + 1} из ${b.steeps.length} завершён`,
      effectiveSound(t, b, s),
      s.vibration ? s.vibeStyle : 'off',
    );
  };

  /** Если пока планировали уведомление, таймер остановили или изменили — отменяем лишнее уведомление. */
  const attach = async (id: string, endAt: number, nid: string | null) => {
    const cur = get(id);
    if (!cur || cur.status !== 'running' || cur.endAt !== endAt) {
      await cancelNotification(nid);
      return;
    }
    patch(id, { notifId: nid });
  };

  const ensure = (brewId: string) => {
    const ex = ref.current.find((t) => t.brewId === brewId);
    if (ex) return ex.id;
    const b = brewsRef.current.find((x) => x.id === brewId);
    if (!b) return null;
    const first = b.steeps[0] ?? 30;
    const t: Timer = { id: uid(), brewId, idx: 0, total: first, remaining: first, endAt: 0, status: 'idle', notifId: null };
    commit([...ref.current, t]);
    return t.id;
  };

  const start = async (id: string) => {
    const t = get(id);
    if (!t || t.status === 'running' || t.status === 'done') return;
    const endAt = Date.now() + t.remaining * 1000;
    patch(id, { status: 'running', endAt });
    const nid = await schedule(t, t.remaining);
    await attach(id, endAt, nid);
  };

  const pause = async (id: string) => {
    const t = get(id);
    if (!t || t.status !== 'running') return;
    patch(id, { status: 'paused', remaining: Math.max(1, Math.ceil((t.endAt - Date.now()) / 1000)), notifId: null });
    await cancelNotification(t.notifId);
  };

  const reset = async (id: string) => {
    const t = get(id);
    if (!t) return;
    patch(id, { status: 'idle', remaining: t.total, notifId: null });
    await cancelNotification(t.notifId);
  };

  const goStep = async (id: string, i: number) => {
    const t = get(id);
    const b = t && brewOf(t);
    if (!t || !b) return;
    const sec = b.steeps[i];
    if (sec === undefined) return;
    patch(id, { idx: i, total: sec, remaining: sec, status: 'idle', notifId: null });
    await cancelNotification(t.notifId);
  };

  const adjust = async (id: string, delta: number) => {
    const t = get(id);
    if (!t || t.status === 'done') return;
    const running = t.status === 'running';
    const leftNow = running ? Math.ceil((t.endAt - Date.now()) / 1000) : t.remaining;
    const next = Math.max(5, leftNow + delta);
    const total = Math.max(5, t.total + delta);
    if (!running) {
      patch(id, { remaining: next, total });
      return;
    }
    const endAt = Date.now() + next * 1000;
    patch(id, { remaining: next, total, endAt, notifId: null });
    await cancelNotification(t.notifId);
    const nid = await schedule(t, next);
    await attach(id, endAt, nid);
  };

  const remove = async (id: string) => {
    const t = get(id);
    commit(ref.current.filter((x) => x.id !== id));
    if (t) await cancelNotification(t.notifId);
  };

  const setSound = async (id: string, sound: SoundKey | undefined) => {
    const t = get(id);
    if (!t) return;
    patch(id, { sound });
    if (t.status !== 'running') return;
    // Звук задаётся каналом уведомления, поэтому у идущего таймера уведомление планируется заново.
    const secs = Math.max(1, Math.ceil((t.endAt - Date.now()) / 1000));
    await cancelNotification(t.notifId);
    patch(id, { notifId: null });
    const nid = await schedule({ ...t, sound }, secs);
    await attach(id, t.endAt, nid);
  };

  const startMany = async (brewIds: string[]) => {
    const ids: string[] = [];
    for (const bid of brewIds) {
      const id = ensure(bid);
      if (id) ids.push(id);
    }
    await Promise.all(
      ids.map((id) => {
        const t = get(id);
        return t && (t.status === 'idle' || t.status === 'paused') ? start(id) : Promise.resolve();
      }),
    );
    return ids;
  };

  const pauseAll = async () => {
    await Promise.all(ref.current.filter((t) => t.status === 'running').map((t) => pause(t.id)));
  };
  const resumeAll = async () => {
    await Promise.all(ref.current.filter((t) => t.status === 'paused').map((t) => start(t.id)));
  };

  const prune = () => {
    const drop = ref.current.filter((t) => t.status === 'idle' && t.idx === 0);
    if (drop.length) commit(ref.current.filter((t) => !drop.includes(t)));
  };

  const anyRunning = timers.some((t) => t.status === 'running');

  // Общий тик для всех таймеров. Считаем по метке окончания, поэтому время не «уплывает» при сворачивании приложения.
  useEffect(() => {
    if (!anyRunning) return;
    const iv = setInterval(() => {
      const nowMs = Date.now();
      let finished = 0;
      const next = ref.current.map((t) => {
        if (t.status === 'running' && t.endAt <= nowMs) {
          finished += 1;
          return { ...t, status: 'done' as const, remaining: 0, notifId: null };
        }
        return t;
      });
      if (finished > 0) {
        commit(next);
        const s = settingsRef.current;
        if (s.vibration) Vibration.vibrate(VIBE_PATTERNS[s.vibeStyle]);
      }
      setTick((n) => n + 1);
    }, 250);
    return () => clearInterval(iv);
  }, [anyRunning]);

  // Экран не гаснет, пока идёт хотя бы один таймер.
  useEffect(() => {
    if (anyRunning) activateKeepAwakeAsync('timers').catch(() => {});
    else deactivateKeepAwake('timers').catch(() => {});
  }, [anyRunning]);
  useEffect(() => () => { deactivateKeepAwake('timers').catch(() => {}); }, []);

  // Сорт удалили или сократили число проливов — приводим таймеры в порядок.
  useEffect(() => {
    const cur = ref.current;
    if (cur.length === 0) return;
    const alive = cur.filter((t) => brews.some((b) => b.id === t.brewId));
    const fixed = alive.map((t) => {
      const b = brews.find((x) => x.id === t.brewId)!;
      return t.idx >= b.steeps.length ? { ...t, idx: Math.max(0, b.steeps.length - 1) } : t;
    });
    const changed = alive.length !== cur.length || fixed.some((t, i) => t !== alive[i]);
    if (!changed) return;
    cur.filter((t) => !alive.includes(t)).forEach((t) => { cancelNotification(t.notifId); });
    commit(fixed);
  }, [brews]);

  const api: TimersApi = {
    timers,
    get,
    forBrew: (brewId) => ref.current.find((t) => t.brewId === brewId),
    left,
    ensure,
    start,
    pause,
    reset,
    goStep,
    adjust,
    remove,
    setSound,
    startMany,
    pauseAll,
    resumeAll,
    prune,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
