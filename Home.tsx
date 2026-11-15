import React, { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Brew, Kind, Settings } from '../types';
import { Btn, Chip, Frame, Header, SERIF, Seal, useP } from '../ui';
import { useTimers } from '../timers';
import { fmt, temp } from '../utils';

export default function Home({ brews, settings, onOpen, onEdit, onAdd, onSettings, onTimers, onStartMany }: {
  brews: Brew[]; settings: Settings;
  onOpen: (brewId: string) => void; onEdit: (id: string) => void; onAdd: () => void; onSettings: () => void;
  onTimers: () => void; onStartMany: (brewIds: string[]) => void;
}) {
  const p = useP();
  const T = useTimers();
  const [filter, setFilter] = useState<'all' | Kind>('all');
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const list = brews.filter((b) => filter === 'all' || b.kind === filter);

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const exitSelect = () => { setSelecting(false); setSel([]); };
  const startSelected = () => { const ids = sel; exitSelect(); onStartMany(ids); };

  const running = T.timers.filter((t) => t.status === 'running');
  const soonest = running.length ? running.reduce((a, b) => (T.left(a) <= T.left(b) ? a : b)) : null;
  const soonestName = soonest ? brews.find((b) => b.id === soonest.brewId)?.name : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      {selecting ? (
        <Header title={`Выбрано: ${sel.length}`} left={{ icon: '✕', onPress: exitSelect }} />
      ) : (
        <Header title="茶道 · Чайный путь" left={{ icon: '⚙', onPress: onSettings }} right2={{ icon: '☑', onPress: () => setSelecting(true) }} right={{ icon: '＋', onPress: onAdd }} />
      )}
      <FlatList
        data={list}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            {!selecting && T.timers.length > 0 && (
              <Pressable onPress={onTimers} style={{ marginBottom: 12 }}>
                <Frame>
                  <Text style={{ color: p.gold, fontSize: 16, fontWeight: '700', fontFamily: SERIF }}>
                    ⏱ Активных таймеров: {T.timers.length}  ›
                  </Text>
                  {soonest && soonestName ? (
                    <Text style={{ color: p.goldSoft, marginTop: 2, fontFamily: SERIF }}>Скоро: {soonestName} · {fmt(T.left(soonest))}</Text>
                  ) : (
                    <Text style={{ color: p.dim, marginTop: 2, fontFamily: SERIF }}>Нажмите, чтобы открыть все таймеры</Text>
                  )}
                </Frame>
              </Pressable>
            )}
            {selecting && (
              <Text style={{ color: p.dim, marginBottom: 10, fontFamily: SERIF }}>
                Отметьте несколько сортов и запустите их таймеры одним нажатием.
              </Text>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
              <Chip label="Всё" active={filter === 'all'} onPress={() => setFilter('all')} />
              <Chip label="Чай" active={filter === 'tea'} onPress={() => setFilter('tea')} />
              <Chip label="Кофе" active={filter === 'coffee'} onPress={() => setFilter('coffee')} />
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={{ color: p.dim, textAlign: 'center', marginTop: 40, fontFamily: SERIF }}>Здесь пока пусто. Нажмите ＋, чтобы добавить сорт.</Text>}
        renderItem={({ item: b }) => {
          const bt = T.forBrew(b.id);
          const picked = sel.includes(b.id);
          return (
            <Pressable
              onPress={() => (selecting ? toggle(b.id) : onOpen(b.id))}
              onLongPress={() => !selecting && onEdit(b.id)}
              style={{ marginBottom: 12 }}
            >
              <Frame>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Seal char={b.kind === 'tea' ? '茶' : '咖'} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: p.text, fontSize: 18, fontWeight: '700', fontFamily: SERIF }}>{b.name}</Text>
                    <Text style={{ color: p.dim, marginTop: 2 }}>
                      {b.category} · {temp(b.tempC, settings.fahrenheit)} · {b.grams} г / {b.waterMl} мл
                    </Text>
                    <Text style={{ color: p.goldSoft, marginTop: 2 }}>
                      {b.steeps.length > 1 ? `${b.steeps.length} ${b.kind === 'tea' ? 'проливов' : 'этапа'}, от ${fmt(b.steeps[0])}` : fmt(b.steeps[0])}
                      {b.custom ? '  · свой' : ''}
                    </Text>
                    {bt && bt.status !== 'idle' && (
                      <Text style={{ color: p.gold, marginTop: 2, fontWeight: '700' }}>
                        {bt.status === 'done' ? '⏱ готово' : bt.status === 'paused' ? `⏱ пауза ${fmt(T.left(bt))}` : `⏱ идёт ${fmt(T.left(bt))}`}
                      </Text>
                    )}
                  </View>
                  {selecting ? (
                    <Text style={{ color: p.gold, fontSize: 26 }}>{picked ? '☑' : '☐'}</Text>
                  ) : (
                    <Pressable onPress={() => onEdit(b.id)} hitSlop={12}>
                      <Text style={{ color: p.gold, fontSize: 20 }}>✎</Text>
                    </Pressable>
                  )}
                </View>
              </Frame>
            </Pressable>
          );
        }}
      />
      {selecting && (
        <View style={{ padding: 12, backgroundColor: p.header, borderTopWidth: 3, borderTopColor: p.gold }}>
          <Btn label={sel.length ? `Запустить таймеры (${sel.length})` : 'Выберите сорта'} onPress={startSelected} disabled={sel.length === 0} />
        </View>
      )}
    </View>
  );
}
