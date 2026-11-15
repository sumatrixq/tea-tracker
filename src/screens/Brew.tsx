import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, Vibration, View } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Brew, Settings } from '../types';
import { Btn, Frame, Header, SERIF, useP } from '../ui';
import { cancelNotification, scheduleDone } from '../notifications';
import { fmt, temp } from '../utils';

type Status = 'idle' | 'running' | 'paused' | 'done';
export type LeaveGuard = { current: null | ((go: () => void) => void) };

export default function BrewScreen({ brew, settings, onBack, guard }: { brew: Brew; settings: Settings; onBack: () => void; guard: LeaveGuard }) {
  const p = useP();
  const [idx, setIdx] = useState(0);
  const [total, setTotal] = useState(brew.steeps[0]);
  const [remaining, setRemaining] = useState(brew.steeps[0]);
  const [status, setStatus] = useState<Status>('idle');
  const endAt = useRef(0);
  const notifId = useRef<string | null>(null);

  const isTea = brew.kind === 'tea';
  const unit = isTea ? 'Пролив' : 'Этап';
  const last = idx >= brew.steeps.length - 1;

  const clearNotif = useCallback(async () => {
    await cancelNotification(notifId.current);
    notifId.current = null;
  }, []);

  const start = async () => {
    endAt.current = Date.now() + remaining * 1000;
    setStatus('running');
    if (settings.notifications) {
      notifId.current = await scheduleDone(remaining, `${brew.name}: готово`, `${unit} ${idx + 1} из ${brew.steeps.length} завершён`);
    }
  };
  const pause = async () => {
    setRemaining(Math.max(1, Math.ceil((endAt.current - Date.now()) / 1000)));
    setStatus('paused');
    await clearNotif();
  };
  const reset = async () => {
    await clearNotif();
    setRemaining(total);
    setStatus('idle');
  };
  const goStep = (i: number) => {
    setIdx(i);
    setTotal(brew.steeps[i]);
    setRemaining(brew.steeps[i]);
    setStatus('idle');
  };
  const adjust = async (delta: number) => {
    const wasRunning = status === 'running';
    const left = wasRunning ? Math.ceil((endAt.current - Date.now()) / 1000) : remaining;
    const next = Math.max(5, left + delta);
    if (wasRunning) await clearNotif();
    setTotal((t) => Math.max(5, t + delta));
    setRemaining(next);
    if (wasRunning) {
      endAt.current = Date.now() + next * 1000;
      if (settings.notifications) {
        notifId.current = await scheduleDone(next, `${brew.name}: готово`, `${unit} ${idx + 1} из ${brew.steeps.length} завершён`);
      }
    }
  };

  // Тик считает по метке окончания, поэтому таймер не «уплывает» при сворачивании приложения.
  useEffect(() => {
    if (status !== 'running') return;
    const t = setInterval(() => {
      const left = Math.ceil((endAt.current - Date.now()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        setStatus('done');
        if (settings.vibration) Vibration.vibrate([0, 500, 250, 500, 250, 500]);
      } else setRemaining(left);
    }, 250);
    return () => clearInterval(t);
  }, [status, settings.vibration]);

  useEffect(() => {
    if (status === 'running') activateKeepAwakeAsync('brew');
    else deactivateKeepAwake('brew');
    return () => { deactivateKeepAwake('brew'); };
  }, [status]);

  // Подтверждение выхода, пока таймер идёт.
  useEffect(() => {
    guard.current = (go) => {
      if (status === 'running' || status === 'paused') {
        Alert.alert('Выйти из таймера?', 'Текущий таймер и уведомление будут отменены.', [
          { text: 'Остаться', style: 'cancel' },
          { text: 'Выйти', style: 'destructive', onPress: go },
        ]);
      } else go();
    };
    return () => { guard.current = null; };
  }, [status, guard]);
  useEffect(() => () => { cancelNotification(notifId.current); }, []);

  const progress = total > 0 ? 1 - remaining / total : 0;
  const bigColor = status === 'done' ? p.gold : p.text;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Header title={brew.name} left={{ icon: '‹', onPress: () => (guard.current ? guard.current(onBack) : onBack()) }} />
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
        <Text style={{ color: p.dim, fontFamily: SERIF }}>
          {brew.category} · {temp(brew.tempC, settings.fahrenheit)} · {brew.grams} г на {brew.waterMl} мл
        </Text>

        <View style={{ width: 250, height: 250, borderRadius: 125, borderWidth: 6, borderColor: p.gold, marginVertical: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: p.card }}>
          <View style={{ position: 'absolute', width: 226, height: 226, borderRadius: 113, borderWidth: 1.5, borderColor: p.gold + '88' }} />
          <Text style={{ color: p.goldSoft, fontFamily: SERIF, fontSize: 16 }}>
            {unit} {idx + 1} / {brew.steeps.length}
          </Text>
          <Text style={{ color: bigColor, fontSize: remaining >= 3600 ? 44 : 60, fontWeight: '700', fontFamily: SERIF }}>{fmt(remaining)}</Text>
          <Text style={{ color: p.dim, fontFamily: SERIF }}>{status === 'done' ? (last ? 'Чай готов 🍵' : 'Сливайте!') : status === 'paused' ? 'пауза' : status === 'running' ? 'идёт заваривание' : 'готов к запуску'}</Text>
        </View>

        <View style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: p.card, borderWidth: 1, borderColor: p.gold, overflow: 'hidden', marginBottom: 20 }}>
          <View style={{ width: `${Math.min(100, progress * 100)}%`, height: '100%', backgroundColor: p.gold }} />
        </View>

        <View style={{ flexDirection: 'row', width: '100%', marginBottom: 12 }}>
          {status === 'running' ? (
            <Btn label="Пауза" onPress={pause} style={{ flex: 1, marginRight: 8 }} />
          ) : status === 'done' ? (
            <Btn label={last ? 'Заново' : `${unit} ${idx + 2} →`} onPress={() => goStep(last ? 0 : idx + 1)} style={{ flex: 1, marginRight: 8 }} />
          ) : (
            <Btn label={status === 'paused' ? 'Продолжить' : 'Старт'} onPress={start} style={{ flex: 1, marginRight: 8 }} />
          )}
          <Btn label="Сброс" variant="outline" onPress={reset} disabled={status === 'idle' && remaining === total} style={{ flex: 1 }} />
        </View>

        {status !== 'done' && (
          <View style={{ flexDirection: 'row', width: '100%', marginBottom: 12 }}>
            <Btn label="−10 с" variant="outline" onPress={() => adjust(-10)} style={{ flex: 1, marginRight: 8 }} />
            <Btn label="+10 с" variant="outline" onPress={() => adjust(10)} style={{ flex: 1 }} />
          </View>
        )}

        {brew.steeps.length > 1 && status !== 'running' && (
          <View style={{ flexDirection: 'row', width: '100%', marginBottom: 12 }}>
            <Btn label="‹ Пред." variant="outline" onPress={() => goStep(idx - 1)} disabled={idx === 0} style={{ flex: 1, marginRight: 8 }} />
            <Btn label="След. ›" variant="outline" onPress={() => goStep(idx + 1)} disabled={last} style={{ flex: 1 }} />
          </View>
        )}

        {!!brew.notes && (
          <Frame style={{ width: '100%', marginTop: 6 }}>
            <Text style={{ color: p.text, fontFamily: SERIF, lineHeight: 21 }}>{brew.notes}</Text>
          </Frame>
        )}
      </ScrollView>
    </View>
  );
}
