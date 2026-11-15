import React, { createContext, useContext } from 'react';
import { Pressable, StatusBar, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { PALETTES, Palette } from './theme';

export const ThemeCtx = createContext<Palette>(PALETTES.imperial);
export const useP = () => useContext(ThemeCtx);
export const SERIF = 'serif';

/** Квадратная красная печать с иероглифом — как оттиск на чайной упаковке. */
export function Seal({ char, size = 44 }: { char: string; size?: number }) {
  const p = useP();
  return (
    <View style={{ width: size, height: size, borderRadius: 6, backgroundColor: p.red, borderWidth: 2, borderColor: p.gold, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: p.gold, fontSize: size * 0.52, fontFamily: SERIF, fontWeight: '700' }}>{char}</Text>
    </View>
  );
}

/** Карточка с двойной золотой рамкой. */
export function Frame({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = useP();
  return (
    <View style={[{ borderWidth: 1.5, borderColor: p.gold, borderRadius: 10, padding: 3, backgroundColor: p.card }, style]}>
      <View style={{ borderWidth: 1, borderColor: p.gold + '88', borderRadius: 7, padding: 12 }}>{children}</View>
    </View>
  );
}

export function Btn({ label, onPress, variant = 'gold', style, disabled }: {
  label: string; onPress: () => void; variant?: 'gold' | 'outline' | 'danger'; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  const p = useP();
  const bg = variant === 'gold' ? p.gold : 'transparent';
  const color = variant === 'gold' ? p.onGold : variant === 'danger' ? '#FF8A7A' : p.gold;
  const border = variant === 'danger' ? '#FF8A7A' : p.gold;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ backgroundColor: bg, borderColor: border, borderWidth: 1.5, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, style]}>
      <Text style={{ color, fontSize: 16, fontWeight: '700', fontFamily: SERIF }}>{label}</Text>
    </Pressable>
  );
}

type HeaderBtn = { icon: string; onPress: () => void };

export function Header({ title, left, right, right2 }: { title: string; left?: HeaderBtn; right?: HeaderBtn; right2?: HeaderBtn }) {
  const p = useP();
  const hit = (b?: HeaderBtn) =>
    b ? (
      <Pressable onPress={b.onPress} hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: p.gold, fontSize: 26 }}>{b.icon}</Text>
      </Pressable>
    ) : null;
  // Левая и правая области одной ширины, чтобы заголовок оставался по центру.
  const slot = 44 * Math.max(1, (right ? 1 : 0) + (right2 ? 1 : 0));
  return (
    <View style={{ backgroundColor: p.header, paddingTop: (StatusBar.currentHeight ?? 24) + 6, paddingBottom: 8, paddingHorizontal: 8, borderBottomWidth: 3, borderBottomColor: p.gold, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: slot, flexDirection: 'row' }}>{hit(left)}</View>
      <Text style={{ flex: 1, textAlign: 'center', color: p.gold, fontSize: 22, fontFamily: SERIF, fontWeight: '700', letterSpacing: 1 }} numberOfLines={1}>{title}</Text>
      <View style={{ width: slot, flexDirection: 'row', justifyContent: 'flex-end' }}>{hit(right2)}{hit(right)}</View>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const p = useP();
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 7, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1.5, borderColor: p.gold, backgroundColor: active ? p.gold : 'transparent', marginRight: 8, marginBottom: 8 }}>
      <Text style={{ color: active ? p.onGold : p.gold, fontWeight: '700', fontFamily: SERIF }}>{label}</Text>
    </Pressable>
  );
}

export const label = (p: Palette): TextStyle => ({ color: p.goldSoft, fontSize: 14, marginBottom: 6, marginTop: 14, fontFamily: SERIF });
