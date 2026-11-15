import { Brew, Settings, SoundKey, Timer, VibeStyle } from './types';

/**
 * file — имя файла в assets/sounds (подключается плагином expo-notifications в app.json),
 * 'default' — системный звук, null — без звука.
 */
export const SOUNDS: { key: SoundKey; label: string; file: string | null }[] = [
  { key: 'bell', label: 'Колокольчик', file: 'bell.wav' },
  { key: 'gong', label: 'Гонг', file: 'gong.wav' },
  { key: 'chime', label: 'Перезвон', file: 'chime.wav' },
  { key: 'bowl', label: 'Поющая чаша', file: 'bowl.wav' },
  { key: 'beep', label: 'Сигнал', file: 'beep.wav' },
  { key: 'system', label: 'Системный', file: 'default' },
  { key: 'silent', label: 'Без звука', file: null },
];

export const VIBE_STYLES: { key: VibeStyle; label: string }[] = [
  { key: 'short', label: 'Короткая' },
  { key: 'normal', label: 'Обычная' },
  { key: 'long', label: 'Длинная' },
];

export const VIBE_PATTERNS: Record<VibeStyle, number[]> = {
  short: [0, 300],
  normal: [0, 400, 200, 400],
  long: [0, 600, 250, 600, 250, 600, 250, 600],
};

export const soundLabel = (k: SoundKey) => SOUNDS.find((s) => s.key === k)?.label ?? k;

/** Приоритет: звук таймера → звук сорта → звук из настроек. */
export const effectiveSound = (t: Timer, b: Brew | undefined, s: Settings): SoundKey => t.sound ?? b?.sound ?? s.sound;
