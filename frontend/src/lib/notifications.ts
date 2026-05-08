import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
let notificationsModule: typeof import('expo-notifications') | null | undefined;

function getNotificationsModule() {
  if (notificationsModule !== undefined) return notificationsModule;
  if (Platform.OS === 'android' && isExpoGo) {
    notificationsModule = null;
    return notificationsModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationsModule = Notifications;
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return notificationsModule;
  }
}

export async function requestNotifPermissions(): Promise<boolean> {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'DaySync',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#fafafa',
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.log('notif perms error', e);
    return false;
  }
}

export async function scheduleEventReminder(eventId: string, title: string, dateIso: string, time: string | undefined, minutesBefore: number): Promise<string | null> {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return null;
    const date = new Date(dateIso);
    if (time) {
      const [h, m] = time.split(':').map(Number);
      date.setHours(h, m, 0, 0);
    } else {
      date.setHours(9, 0, 0, 0);
    }
    const fireAt = new Date(date.getTime() - minutesBefore * 60_000);
    if (fireAt.getTime() <= Date.now()) return null;
    const id = await Notifications.scheduleNotificationAsync({
      identifier: `event-${eventId}`,
      content: {
        title: 'DaySync – Promemoria',
        body: title,
        data: { eventId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt } as any,
    });
    return id;
  } catch (e) {
    console.log('schedule err', e);
    return null;
  }
}

export async function cancelEventReminder(eventId: string) {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;
    await Notifications.cancelScheduledNotificationAsync(`event-${eventId}`);
  } catch {}
}
