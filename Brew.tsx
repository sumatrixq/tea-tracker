import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Brew, Settings } from '../types';
import { Btn, Chip, Frame, Header, SERIF, useP } from '../ui';
import { statusText, useTimers } from '../timers';
import { SOUNDS, effectiveSound, soundLabel } from '../sounds';
import { testSound } from '../notifications';
import { fmt, temp } from '../utils';

export default function BrewScreen({ timerId, brew, settings, onBack, onTimers }: {
  timerId: string; brew: Brew; settings: Settings; onBack: () => void; onTimers: () => void;
}) {
  const p = useP();
  const T = useTimers();
  const t = T.get(timerId);
  const [soundOpen, setSoundOpen] = useState(false);
  if (!t) return null;

  const isTea = brew.kind === 'tea';
  const unit = isTea ? 'Пролив' : 'Этап';
  const idx = Math.min(t.idx, brew.steeps.length - 1);
  const last = idx >= brew.steeps.length - 1;
  const status = t.status;
  const remaining = T.left(t);
  const progress = t.total > 0 ? 1 - remaining / t.total : 0;
  const bigColor = status === 'done' ? p.gold : p.text;
  const step = settings.adjustStep;
  const eff = effectiveSound(t, brew, settings);
  const started = status !== 'idle' || idx > 0;

  const stop = () => {
    if (status === 'running' || status === 'paused') {
      Alert.alert('Остановить таймер?', 'Текущий таймер и уведомление будут отменены.', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Остановить', style: 'destructive', onPress: () => { T.remove(t.id); } },
      ]);
    } else {
      T.remove(t.id);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Header title={brew.name} left={{ icon: '‹', onPress: onBack }} right={{ icon: '⏱', onPress: onTimers }} />
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
          <Text style={{ color: p.dim, fontFamily: SERIF }}>{statusText(status, last, isTea)}</Text>
        </View>

        <View style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: p.card, borderWidth: 1, borderColor: p.gold, overflow: 'hidden', marginBottom: 20 }}>
          <View style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, height: '100%', backgroundColor: p.gold }} />
        </View>

        <View style={{ flexDirection: 'row', width: '100%', marginBottom: 12 }}>
          {status === 'running' ? (
            <Btn label="Пауза" onPress={() => T.pause(t.id)} style={{ flex: 1, marginRight: 8 }} />
          ) : status === 'done' ? (
            <Btn label={last ? 'Заново' : `${unit} ${idx + 2} →`} onPress={() => T.goStep(t.id, last ? 0 : idx + 1)} style={{ flex: 1, marginRight: 8 }} />
          ) : (
            <Btn label={status === 'paused' ? 'Продолжить' : 'Старт'} onPress={() => T.start(t.id)} style={{ flex: 1, marginRight: 8 }} />
          )}
          <Btn label="Сброс" variant="outline" onPress={() => T.reset(t.id)} disabled={status === 'idle' && remaining === t.total} style={{ flex: 1 }} />
        </View>

        {status !== 'done' && (
          <View style={{ flexDirection: 'row', width: '100%', marginBottom: 12 }}>
            <Btn label={`−${step} с`} variant="outline" onPress={() => T.adjust(t.id, -step)} style={{ flex: 1, marginRight: 8 }} />
            <Btn label={`+${step} с`} variant="outline" onPress={() => T.adjust(t.id, step)} style={{ flex: 1 }} />
          </View>
        )}

        {brew.steeps.length > 1 && status !== 'running' && (
          <View style={{ flexDirection: 'row', width: '100%', marginBottom: 12 }}>
            <Btn label="‹ Пред." variant="outline" onPress={() => T.goStep(t.id, idx - 1)} disabled={idx === 0} style={{ flex: 1, marginRight: 8 }} />
            <Btn label="След. ›" variant="outline" onPress={() => T.goStep(t.id, idx + 1)} disabled={last} style={{ flex: 1 }} />
          </View>
        )}

        <Frame style={{ width: '100%', marginTop: 6 }}>
          <Pressable onPress={() => setSoundOpen((o) => !o)}>
            <Text style={{ color: p.goldSoft, fontFamily: SERIF, fontSize: 16 }}>
              Звук: {soundLabel(eff)}{t.sound ? ' (только для этого таймера)' : ''}  {soundOpen ? '▴' : '▾'}
            </Text>
          </Pressable>
          {soundOpen && (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Chip label="По умолчанию" active={!t.sound} onPress={() => T.setSound(t.id, undefined)} />
                {SOUNDS.map((s) => (
                  <Chip key={s.key} label={s.label} active={t.sound === s.key} onPress={() => T.setSound(t.id, s.key)} />
                ))}
              </View>
              <Btn label="Проверить звук" variant="outline" onPress={() => testSound(eff, settings.vibration, settings.vibeStyle)} />
            </View>
          )}
        </Frame>

        {!!brew.notes && (
          <Frame style={{ width: '100%', marginTop: 12 }}>
            <Text style={{ color: p.text, fontFamily: SERIF, lineHeight: 21 }}>{brew.notes}</Text>
          </Frame>
        )}

        {started && <Btn label="Остановить и убрать таймер" variant="danger" onPress={stop} style={{ width: '100%', marginTop: 16 }} />}
      </ScrollView>
    </View>
  );
}
