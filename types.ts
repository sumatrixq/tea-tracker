export type Kind = 'tea' | 'coffee';
export type ThemeKey = 'imperial' | 'lacquer' | 'paper';
export type SoundKey = 'bell' | 'gong' | 'chime' | 'bowl' | 'beep' | 'system' | 'silent';
export type VibeStyle = 'short' | 'normal' | 'long';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export interface Brew {
  id: string;
  name: string;
  kind: Kind;
  category: string;
  tempC: number;
  grams: number;
  waterMl: number;
  steeps: number[]; // длительность каждого пролива/этапа, секунды
  notes: string;
  custom: boolean;
  sound?: SoundKey; // свой звук сорта; если не задан — берётся из настроек
}

export interface Settings {
  theme: ThemeKey;
  notifications: boolean;
  vibration: boolean;
  fahrenheit: boolean;
  sound: SoundKey; // звук таймера по умолчанию
  vibeStyle: VibeStyle; // рисунок вибрации
  adjustStep: number; // шаг кнопок −/+ в секундах
}

/** Один запущенный (или подготовленный) таймер сорта. */
export interface Timer {
  id: string;
  brewId: string;
  idx: number; // номер текущего пролива/этапа
  total: number; // длительность текущего пролива с учётом правок, сек
  remaining: number; // остаток, сек (актуален, когда таймер не идёт)
  endAt: number; // метка окончания, мс (актуальна, когда таймер идёт)
  status: TimerStatus;
  notifId: string | null;
  sound?: SoundKey; // звук только для этого таймера
}
