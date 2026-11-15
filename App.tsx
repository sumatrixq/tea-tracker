import React, { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Brew, Settings } from './src/types';
import { DEFAULT_BREWS } from './src/data';
import { DEFAULT_SETTINGS, loadBrews, loadSettings, saveBrews, saveSettings } from './src/storage';
import { setupNotifications } from './src/notifications';
import { PALETTES } from './src/theme';
import { ThemeCtx } from './src/ui';
import { TimersProvider, useTimers } from './src/timers';
import Home from './src/screens/Home';
import BrewScreen from './src/screens/Brew';
import Timers from './src/screens/Timers';
import Editor from './src/screens/Editor';
import SettingsScreen from './src/screens/SettingsScreen';

type Screen =
  | { n: 'home' }
  | { n: 'brew'; timerId: string }
  | { n: 'timers' }
  | { n: 'edit'; id?: string }
  | { n: 'settings' };

function Router({ brews, setBrews, settings, setSettings }: {
  brews: Brew[]; setBrews: React.Dispatch<React.SetStateAction<Brew[]>>;
  settings: Settings; setSettings: (s: Settings) => void;
}) {
  const T = useTimers();
  const [screen, setScreen] = useState<Screen>({ n: 'home' });
  const home = () => setScreen({ n: 'home' });

  // Таймеры, которые открыли, но не запустили, убираем при выходе с экрана таймера.
  useEffect(() => { if (screen.n !== 'brew') T.prune(); }, [screen]);
  // Таймер удалили, пока открыт его экран, — возвращаемся к списку.
  useEffect(() => {
    if (screen.n === 'brew' && !T.get(screen.timerId)) setScreen({ n: 'home' });
  }, [T.timers, screen]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.n === 'home') return false;
      home();
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  const find = (id?: string) => brews.find((b) => b.id === id);

  const homeEl = (
    <Home
      brews={brews}
      settings={settings}
      onOpen={(brewId) => { const id = T.ensure(brewId); if (id) setScreen({ n: 'brew', timerId: id }); }}
      onEdit={(id) => setScreen({ n: 'edit', id })}
      onAdd={() => setScreen({ n: 'edit' })}
      onSettings={() => setScreen({ n: 'settings' })}
      onTimers={() => setScreen({ n: 'timers' })}
      onStartMany={async (ids) => { await T.startMany(ids); setScreen({ n: 'timers' }); }}
    />
  );

  if (screen.n === 'brew') {
    const t = T.get(screen.timerId);
    const b = t && find(t.brewId);
    return t && b
      ? <BrewScreen key={t.id} timerId={t.id} brew={b} settings={settings} onBack={home} onTimers={() => setScreen({ n: 'timers' })} />
      : homeEl;
  }
  if (screen.n === 'timers') {
    return <Timers brews={brews} settings={settings} onBack={home} onOpen={(timerId) => setScreen({ n: 'brew', timerId })} />;
  }
  if (screen.n === 'edit') {
    return (
      <Editor
        brew={find(screen.id)}
        onBack={home}
        onSave={(b) => { setBrews((l) => (l.some((x) => x.id === b.id) ? l.map((x) => (x.id === b.id ? b : x)) : [...l, b])); home(); }}
        onDelete={(id) => { setBrews((l) => l.filter((x) => x.id !== id)); home(); }}
      />
    );
  }
  if (screen.n === 'settings') {
    return <SettingsScreen settings={settings} onChange={setSettings} onBack={home} onResetBrews={() => { setBrews(DEFAULT_BREWS); home(); }} />;
  }
  return homeEl;
}

export default function App() {
  const [brews, setBrews] = useState<Brew[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      setBrews(await loadBrews());
      const s = await loadSettings();
      setSettings(s);
      setReady(true);
      setupNotifications(s.sound, s.vibration ? s.vibeStyle : 'off');
    })();
  }, []);
  useEffect(() => { if (ready) saveBrews(brews); }, [brews, ready]);
  useEffect(() => { if (ready) saveSettings(settings); }, [settings, ready]);

  const palette = PALETTES[settings.theme];
  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.bg }} />;

  return (
    <ThemeCtx.Provider value={palette}>
      <StatusBar style="light" />
      <TimersProvider brews={brews} settings={settings}>
        <Router brews={brews} setBrews={setBrews} settings={settings} setSettings={setSettings} />
      </TimersProvider>
    </ThemeCtx.Provider>
  );
}
