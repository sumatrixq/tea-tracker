import React from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { Settings, ThemeKey } from '../types';
import { PALETTES } from '../theme';
import { SOUNDS, VIBE_STYLES } from '../sounds';
import { testSound } from '../notifications';
import { Btn, Chip, Frame, Header, SERIF, label, useP } from '../ui';

const STEPS = [5, 10, 15, 30];

export default function SettingsScreen({ settings, onChange, onResetBrews, onBack }: {
  settings: Settings; onChange: (s: Settings) => void; onResetBrews: () => void; onBack: () => void;
}) {
  const p = useP();
  const row = (title: string, sub: string, key: 'notifications' | 'vibration' | 'fahrenheit') => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: p.text, fontSize: 16, fontFamily: SERIF }}>{title}</Text>
        <Text style={{ color: p.dim, fontSize: 13 }}>{sub}</Text>
      </View>
      <Switch value={settings[key]} onValueChange={(v) => onChange({ ...settings, [key]: v })} trackColor={{ true: p.gold, false: p.dim + '66' }} thumbColor={settings[key] ? p.goldSoft : '#ccc'} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Header title="Настройки" left={{ icon: '‹', onPress: onBack }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }}>
        <Text style={label(p)}>Тема оформления</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {(Object.keys(PALETTES) as ThemeKey[]).map((k) => (
            <Chip key={k} label={PALETTES[k].label} active={settings.theme === k} onPress={() => onChange({ ...settings, theme: k })} />
          ))}
        </View>

        <Text style={label(p)}>Звук таймера</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {SOUNDS.map((s) => (
            <Chip key={s.key} label={s.label} active={settings.sound === s.key} onPress={() => onChange({ ...settings, sound: s.key })} />
          ))}
        </View>
        <Btn label="Проверить звук" variant="outline" onPress={() => testSound(settings.sound, settings.vibration, settings.vibeStyle)} />
        <Text style={{ color: p.dim, fontSize: 12, marginTop: 6, fontFamily: SERIF }}>
          Проверка придёт уведомлением через 2 секунды. Свой звук можно выбрать и для отдельного сорта (при редактировании) или таймера.
        </Text>

        <Text style={label(p)}>Рисунок вибрации</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {VIBE_STYLES.map((v) => (
            <Chip key={v.key} label={v.label} active={settings.vibeStyle === v.key} onPress={() => onChange({ ...settings, vibeStyle: v.key })} />
          ))}
        </View>

        <Text style={label(p)}>Шаг кнопок −/+ на таймере</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {STEPS.map((n) => (
            <Chip key={n} label={`${n} с`} active={settings.adjustStep === n} onPress={() => onChange({ ...settings, adjustStep: n })} />
          ))}
        </View>

        <Frame style={{ marginTop: 16 }}>
          {row('Уведомления', 'Сообщить, когда пролив готов, даже если приложение свёрнуто', 'notifications')}
          {row('Вибрация', 'Вибрировать по окончании таймера', 'vibration')}
          {row('Температура в °F', 'Показывать градусы Фаренгейта', 'fahrenheit')}
        </Frame>

        <Btn
          label="Вернуть стандартные сорта"
          variant="outline"
          style={{ marginTop: 24 }}
          onPress={() =>
            Alert.alert('Сбросить список?', 'Все ваши сорта и правки будут удалены, вернутся стандартные.', [
              { text: 'Отмена', style: 'cancel' },
              { text: 'Сбросить', style: 'destructive', onPress: onResetBrews },
            ])
          }
        />
      </ScrollView>
    </View>
  );
}
