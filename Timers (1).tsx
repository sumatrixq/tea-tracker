import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Brew, Settings } from '../types';
import { Btn, Frame, Header, SERIF, useP } from '../ui';
import { statusText, useTimers } from '../timers';
import { fmt } from '../utils';

const small = { paddingVertical: 9, paddingHorizontal: 12 } as const;

export default function Timers({ brews, settings, onBack, onOpen }: {
  brews: Brew[]; settings: Settings; onBack: () => void; onOpen: (timerId: string) => void;
}) {
  const p = useP();
  const T = useTimers();
  const step = settings.adjustStep;
  const anyRunning = T.timers.some((t) => t.status === 'running');
  const anyPaused = T.timers.some((t) => t.status === 'paused');

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Header title="Таймеры" left={{ icon: '‹', onPress: onBack }} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        {T.timers.length === 0 && (
          <Text style={{ color: p.dim, textAlign: 'center', marginTop: 40, fontFamily: SERIF, lineHeight: 22 }}>
            Активных таймеров нет.{'\n'}Вернитесь к списку, выберите сорт или отметьте сразу несколько кнопкой ☑.
          </Text>
        )}

        {T.timers.length > 1 && (
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Btn label="Пауза всех" variant="outline" onPress={() => T.pauseAll()} disabled={!anyRunning} style={{ flex: 1, marginRight: 8 }} />
            <Btn label="Продолжить все" variant="outline" onPress={() => T.resumeAll()} disabled={!anyPaused} style={{ flex: 1 }} />
          </View>
        )}

        {T.timers.map((t) => {
          const b = brews.find((x) => x.id === t.brewId);
          if (!b) return null;
          const isTea = b.kind === 'tea';
          const unit = isTea ? 'Пролив' : 'Этап';
          const idx = Math.min(t.idx, b.steeps.length - 1);
          const last = idx >= b.steeps.length - 1;
          const remaining = T.left(t);
          const progress = t.total > 0 ? 1 - remaining / t.total : 0;
          const done = t.status === 'done';

          const remove = () => {
            if (t.status === 'running' || t.status === 'paused') {
              Alert.alert('Остановить таймер?', `«${b.name}»: таймер и уведомление будут отменены.`, [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Остановить', style: 'destructive', onPress: () => { T.remove(t.id); } },
              ]);
            } else {
              T.remove(t.id);
            }
          };

          return (
            <Frame key={t.id} style={{ marginBottom: 12 }}>
              <Pressable onPress={() => onOpen(t.id)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: p.text, fontSize: 18, fontWeight: '700', fontFamily: SERIF, flex: 1 }} numberOfLines={1}>{b.name}</Text>
                  <Text style={{ color: p.goldSoft, fontFamily: SERIF }}>{unit} {idx + 1}/{b.steeps.length}</Text>
                </View>
                <Text style={{ color: done ? p.gold : p.text, fontSize: 40, fontWeight: '700', fontFamily: SERIF, textAlign: 'center', marginTop: 6 }}>{fmt(remaining)}</Text>
                <Text style={{ color: p.dim, fontFamily: SERIF, textAlign: 'center' }}>{statusText(t.status, last, isTea)}</Text>
              </Pressable>

              <View style={{ height: 6, borderRadius: 3, backgroundColor: p.bg, borderWidth: 1, borderColor: p.gold, overflow: 'hidden', marginVertical: 10 }}>
                <View style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, height: '100%', backgroundColor: p.gold }} />
              </View>

              <View style={{ flexDirection: 'row' }}>
                {t.status === 'running' ? (
                  <Btn label="Пауза" onPress={() => T.pause(t.id)} style={{ ...small, flex: 3, marginRight: 6 }} />
                ) : done ? (
                  <Btn label={last ? 'Заново' : `${unit} ${idx + 2} →`} onPress={() => T.goStep(t.id, last ? 0 : idx + 1)} style={{ ...small, flex: 3, marginRight: 6 }} />
                ) : (
                  <Btn label={t.status === 'paused' ? 'Продолжить' : 'Старт'} onPress={() => T.start(t.id)} style={{ ...small, flex: 3, marginRight: 6 }} />
                )}
                {!done && (
                  <>
                    <Btn label={`−${step}`} variant="outline" onPress={() => T.adjust(t.id, -step)} style={{ ...small, flex: 1, marginRight: 6 }} />
                    <Btn label={`+${step}`} variant="outline" onPress={() => T.adjust(t.id, step)} style={{ ...small, flex: 1, marginRight: 6 }} />
                  </>
                )}
                <Btn label="✕" variant="danger" onPress={remove} style={{ ...small, flex: 1 }} />
              </View>
            </Frame>
          );
        })}
      </ScrollView>
    </View>
  );
}
