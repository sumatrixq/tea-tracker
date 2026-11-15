export type Kind = 'tea' | 'coffee';
export type ThemeKey = 'imperial' | 'lacquer' | 'paper';

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
}

export interface Settings {
  theme: ThemeKey;
  notifications: boolean;
  vibration: boolean;
  fahrenheit: boolean;
}
