import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Brew, Settings } from './src/types';
import { DEFAULT_BREWS } from './src/data';
import { DEFAULT_SETTINGS, loadBrews, loadSettings, saveBrews, saveSettings } from './src/storage';
import { setupNotifications } from './src/notifications';
import { PALETTES } from './src/theme';
import { ThemeCtx } from './src/ui';
import Home from './src/screens/Home';
import BrewScreen, { LeaveGuard } from './src/screens/Brew';
import Editor from './src/screens/Editor';
import SettingsScreen from './src/screens/SettingsScreen';

type Screen = { n: 'home' } | { n: 'brew'; id: string } | { n: 'edit'; id?: string } | { n: 'settings' };

export default function App() {
  const [brews, setBrews] = useState<Brew[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>({ n: 'home' });
  const guard: LeaveGuard = useRef<null | ((go: () => void) => void)>(null);

  useEffect(() => {
    (async () => {
      setBrews(await loadBrews());
      setSettings(await loadSettings());
      setReady(true);
      setupNotifications();
    })();
  }, []);
  useEffect(() => { if (ready) saveBrews(brews); }, [brews, ready]);
  useEffect(() => { if (ready) saveSettings(settings); }, [settings, ready]);

  const home = () => setScreen({ n: 'home' });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.n === 'home') return false;
      if (guard.current) guard.current(home); else home();
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  const palette = PALETTES[settings.theme];
  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.bg }} />;

  const find = (id?: string) => brews.find((b) => b.id === id);
  let body: React.ReactNode;
  if (screen.n === 'brew' && find(screen.id)) {
    body = <BrewScreen key={screen.id} brew={find(screen.id)!} settings={settings} onBack={home} guard={guard} />;
  } else if (screen.n === 'edit') {
    body = (
      <Editor
        brew={find(screen.id)}
        onBack={home}
        onSave={(b) => { setBrews((l) => (l.some((x) => x.id === b.id) ? l.map((x) => (x.id === b.id ? b : x)) : [...l, b])); home(); }}
        onDelete={(id) => { setBrews((l) => l.filter((x) => x.id !== id)); home(); }}
      />
    );
  } else if (screen.n === 'settings') {
    body = <SettingsScreen settings={settings} onChange={setSettings} onBack={home} onResetBrews={() => { setBrews(DEFAULT_BREWS); home(); }} />;
  } else {
    body = <Home brews={brews} settings={settings} onOpen={(id) => setScreen({ n: 'brew', id })} onEdit={(id) => setScreen({ n: 'edit', id })} onAdd={() => setScreen({ n: 'edit' })} onSettings={() => setScreen({ n: 'settings' })} />;
  }

  return (
    <ThemeCtx.Provider value={palette}>
      <StatusBar style="light" />
      {body}
    </ThemeCtx.Provider>
  );
}
