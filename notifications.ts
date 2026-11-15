import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SoundKey, VibeStyle } from './types';
import { SOUNDS, VIBE_PATTERNS, VIBE_STYLES } from './sounds';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export type Vibe = VibeStyle | 'off';

const made = new Set<string>();

/**
 * На Android 8+ звук и вибрацию задаёт канал уведомлений, и после создания их нельзя изменить.
 * Поэтому для каждой пары «звук + вибрация» создаётся свой канал (лениво, при первом использовании).
 */
async function ensureChannel(sound: SoundKey, vibe: Vibe): Promise<string> {
  const id = `brew_${sound}_${vibe}`;
  if (Platform.OS !== 'android' || made.has(id)) return id;
  const def = SOUNDS.find((s) => s.key === sound) ?? SOUNDS[0];
  const vibeLabel = vibe === 'off' ? 'без вибрации' : `вибрация: ${(VIBE_STYLES.find((v) => v.key === vibe)?.label ?? '').toLowerCase()}`;
  await Notifications.setNotificationChannelAsync(id, {
    name: `Таймер · ${def.label} · ${vibeLabel}`,
    importance: Notifications.AndroidImportance.MAX,
    sound: def.file,
    enableVibrate: vibe !== 'off',
    vibrationPattern: vibe === 'off' ? undefined : VIBE_PATTERNS[vibe],
  });
  made.add(id);
  return id;
}

export async function setupNotifications(sound: SoundKey, vibe: Vibe): Promise<boolean> {
  try {
    // Канал нужно создать до запроса разрешения, иначе на Android 13+ окно разрешения не появится.
    await ensureChannel(sound, vibe);
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function scheduleDone(seconds: number, title: string, body: string, sound: SoundKey, vibe: Vibe): Promise<string | null> {
  try {
    const channelId = await ensureChannel(sound, vibe);
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: sound !== 'silent' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId,
      },
    });
  } catch {
    return null;
  }
}

/** Проверка звука: уведомление придёт через 2 секунды. */
export const testSound = (sound: SoundKey, vibration: boolean, style: VibeStyle) =>
  scheduleDone(2, 'Проверка звука', 'Так будет звучать сигнал таймера', sound, vibration ? style : 'off');

export async function cancelNotification(id: string | null) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}
